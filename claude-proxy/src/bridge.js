import Anthropic from '@anthropic-ai/sdk';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { Logger } from './utils/logger.js';

export class ClaudeProxyBridge {
  constructor(options = {}) {
    this.options = {
      anthropicApiKey: options.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
      cacheEnabled: options.cacheEnabled !== false,
      cacheTtl: options.cacheTtl || 300, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      maxTokens: options.maxTokens || 4096,
      defaultModel: options.defaultModel || 'claude-sonnet-4-20250514',
      ...options,
    };

    this.logger = new Logger();
    
    // Initialize Anthropic SDK
    this.anthropic = new Anthropic({
      apiKey: this.options.anthropicApiKey,
    });

    // Initialize cache
    this.cache = this.options.cacheEnabled 
      ? new NodeCache({ stdTTL: this.options.cacheTtl, checkperiod: 60 })
      : null;

    // Metrics storage
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      uptime: Date.now(),
    };

    this.logger.info('🔗 Claude Proxy Bridge initialized', {
      cacheEnabled: this.options.cacheEnabled,
      defaultModel: this.options.defaultModel,
      maxTokens: this.options.maxTokens,
    });
  }

  /**
   * 🎯 Main proxy request method
   */
  async proxyRequest(request) {
    const startTime = Date.now();
    this.metrics.requests++;
    this.metrics.lastRequestTime = new Date().toISOString();

    try {
      // Generate cache key for the request
      const cacheKey = this.generateCacheKey(request);
      
      // Check cache first
      if (this.cache && request.method !== 'POST') {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.metrics.cacheHits++;
          this.logger.info(`[${request.requestId}] Cache hit for request`);
          return this.formatResponse(cached, { fromCache: true });
        }
        this.metrics.cacheMisses++;
      }

      // Prepare Claude API request
      const claudeRequest = this.transformToClaudeFormat(request);
      
      // Execute request with retry logic
      const response = await this.executeWithRetry(claudeRequest, request.requestId);
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(response, responseTime);
      
      // Cache the response
      if (this.cache && response.usage) {
        this.cache.set(cacheKey, response, this.options.cacheTtl);
      }

      // Format and return response
      return this.formatResponse(response, { 
        requestId: request.requestId,
        responseTime,
      });

    } catch (error) {
      this.metrics.errors++;
      const responseTime = Date.now() - startTime;
      
      this.logger.error(`[${request.requestId}] Request failed after ${responseTime}ms:`, error);
      
      // Return structured error
      throw {
        status: error.status || 500,
        message: error.message || 'Request failed',
        requestId: request.requestId,
        responseTime,
        retryable: this.isRetryableError(error),
      };
    }
  }

  /**
   * 🔄 Transform GitHub Actions request to Claude format
   */
  transformGitHubActionsRequest(ghRequest) {
    const {
      prompt,
      direct_prompt,
      model = this.options.defaultModel,
      max_tokens = this.options.maxTokens,
      temperature = 0.3,
      system_prompt,
      context,
      action = 'chat',
      ...otherParams
    } = ghRequest;

    // Build messages array
    const messages = [];
    
    // Add system message if provided
    if (system_prompt) {
      messages.push({
        role: 'system',
        content: system_prompt,
      });
    }

    // Add context if provided
    if (context) {
      messages.push({
        role: 'user',
        content: `Context: ${context}`,
      });
    }

    // Add main prompt
    const mainPrompt = direct_prompt || prompt;
    if (mainPrompt) {
      messages.push({
        role: 'user',
        content: mainPrompt,
      });
    }

    return {
      model,
      max_tokens,
      temperature,
      messages,
      action,
      ...otherParams,
    };
  }

  /**
   * 🔄 Transform Claude response to GitHub Actions format
   */
  transformGitHubActionsResponse(claudeResponse) {
    return {
      action: 'response',
      success: true,
      response: claudeResponse.content?.[0]?.text || claudeResponse.content,
      usage: claudeResponse.usage,
      model: claudeResponse.model,
      metadata: {
        requestId: claudeResponse.requestId,
        responseTime: claudeResponse.responseTime,
        fromCache: claudeResponse.fromCache || false,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 🔧 Transform request to Claude API format
   */
  transformToClaudeFormat(request) {
    const {
      model = this.options.defaultModel,
      max_tokens = this.options.maxTokens,
      temperature = 0.3,
      messages,
      system,
      stop_sequences,
      ...otherParams
    } = request;

    const claudeRequest = {
      model,
      max_tokens: Math.min(max_tokens, 8192), // Enforce reasonable limits
      temperature: Math.max(0, Math.min(1, temperature)), // Clamp temperature
      messages: messages || [],
      ...otherParams,
    };

    // Add system message if provided
    if (system) {
      claudeRequest.system = system;
    }

    // Add stop sequences if provided
    if (stop_sequences) {
      claudeRequest.stop_sequences = stop_sequences;
    }

    return claudeRequest;
  }

  /**
   * ⚡ Execute request with retry logic
   */
  async executeWithRetry(claudeRequest, requestId, attempt = 1) {
    try {
      this.logger.debug(`[${requestId}] Executing Claude API request (attempt ${attempt})`);
      
      const response = await this.anthropic.messages.create(claudeRequest);
      
      this.logger.debug(`[${requestId}] Claude API request successful`, {
        model: response.model,
        usage: response.usage,
      });
      
      return response;
      
    } catch (error) {
      this.logger.warn(`[${requestId}] Attempt ${attempt} failed:`, error.message);
      
      // Check if we should retry
      if (attempt < this.options.retryAttempts && this.isRetryableError(error)) {
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.logger.info(`[${requestId}] Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
        return this.executeWithRetry(claudeRequest, requestId, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * 🏷️ Generate cache key for request
   */
  generateCacheKey(request) {
    const keyData = {
      model: request.model || this.options.defaultModel,
      messages: request.messages,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      system: request.system,
    };
    
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return `claude_${hash.substring(0, 16)}`;
  }

  /**
   * 📊 Update metrics
   */
  updateMetrics(response, responseTime) {
    if (response.usage) {
      this.metrics.totalTokens += (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0);
    }
    
    // Update average response time
    const currentAvg = this.metrics.averageResponseTime;
    const requests = this.metrics.requests;
    this.metrics.averageResponseTime = (currentAvg * (requests - 1) + responseTime) / requests;
  }

  /**
   * 📋 Format response
   */
  formatResponse(response, metadata = {}) {
    return {
      ...response,
      ...metadata,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🔍 Check if error is retryable
   */
  isRetryableError(error) {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    
    return (
      retryableStatuses.includes(error.status) ||
      retryableErrors.includes(error.code) ||
      error.message?.includes('rate limit') ||
      error.message?.includes('timeout')
    );
  }

  /**
   * ⏰ Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 Get current status
   */
  async getStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.metrics.uptime,
      cache: this.cache ? {
        enabled: true,
        keys: this.cache.keys().length,
        stats: this.cache.getStats(),
      } : { enabled: false },
      anthropic: {
        configured: !!this.options.anthropicApiKey,
        defaultModel: this.options.defaultModel,
      },
    };
  }

  /**
   * 📈 Get metrics
   */
  async getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
      cacheStats: this.cache ? this.cache.getStats() : null,
    };
  }

  /**
   * 🧹 Clear cache
   */
  async clearCache() {
    if (this.cache) {
      this.cache.flushAll();
      this.logger.info('Cache cleared successfully');
    }
  }

  /**
   * 📊 Get cache stats
   */
  async getCacheStats() {
    if (!this.cache) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      keys: this.cache.keys().length,
      stats: this.cache.getStats(),
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
      hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
    };
  }
}