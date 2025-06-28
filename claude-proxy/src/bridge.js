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
    
    // Initialize authentication methods in priority order
    this.initializeAuthMethods();

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
   * 🔐 Initialize authentication methods in priority order
   */
  async initializeAuthMethods() {
    // 1. Try Anthropic API key first (highest priority)
    if (this.options.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.options.anthropicApiKey,
      });
      this.authMethod = 'api';
      this.logger.info('🔑 Using Anthropic API key authentication');
      return;
    }

    // 2. Try TypeScript SDK (preferred for MAX subscribers)
    try {
      const { ClaudeCodeSDK } = await import('./claudeCodeSDK.js');
      this.claudeSDK = new ClaudeCodeSDK(this.options);
      
      if (await this.claudeSDK.isAvailable()) {
        this.authMethod = 'sdk';
        this.logger.info('🚀 Using Claude Code TypeScript SDK (MAX subscription)');
        return;
      }
    } catch (error) {
      this.logger.debug('Claude Code SDK not available:', error.message);
    }

    // 3. Fallback to CLI
    try {
      const { ClaudeCodeCLI } = await import('./claudeCodeCLI.js');
      this.claudeCLI = new ClaudeCodeCLI();
      this.authMethod = 'cli';
      this.logger.warn('📟 Using Claude Code CLI fallback (MAX subscription)');
      return;
    } catch (error) {
      this.logger.debug('Claude Code CLI not available:', error.message);
    }

    // 4. No authentication method available
    this.authMethod = 'none';
    this.logger.error('❌ No authentication method available');
  }

  /**
   * 🌊 Streaming proxy request method
   */
  async proxyRequestStream(request, onChunk) {
    const startTime = Date.now();
    this.metrics.requests++;
    this.metrics.lastRequestTime = new Date().toISOString();

    try {
      this.logger.debug(`[${request.requestId}] Starting streaming request via ${this.authMethod}`);

      // Prepare Claude API request
      const claudeRequest = this.transformToClaudeFormat(request);
      
      // Execute streaming request based on auth method
      await this.executeStreamWithRetry(claudeRequest, request.requestId, onChunk);
      
      const responseTime = Date.now() - startTime;
      this.logger.info(`[${request.requestId}] Streaming request completed in ${responseTime}ms`);
      
    } catch (error) {
      this.metrics.errors++;
      const responseTime = Date.now() - startTime;
      
      this.logger.error(`[${request.requestId}] Streaming request failed after ${responseTime}ms:`, error);
      
      // Send error to stream
      if (onChunk) {
        onChunk(`ERROR: ${error.message || 'Stream failed'}`, 'error');
      }
      
      throw {
        status: error.status || 500,
        message: error.message || 'Streaming request failed',
        requestId: request.requestId,
        responseTime,
      };
    }
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
   * 🌊 Execute streaming request with retry logic
   */
  async executeStreamWithRetry(claudeRequest, requestId, onChunk, attempt = 1) {
    try {
      this.logger.debug(`[${requestId}] Executing streaming Claude request (attempt ${attempt}) via ${this.authMethod}`);
      
      switch (this.authMethod) {
        case 'api':
          // Anthropic API streaming (highest priority)
          await this.streamAnthropicAPI(claudeRequest, requestId, onChunk);
          break;
          
        case 'sdk':
          // TypeScript SDK streaming (preferred for MAX)
          this.logger.info(`[${requestId}] Using Claude Code TypeScript SDK streaming (MAX subscription)`);
          const { prompt, sdkOptions } = this.claudeSDK.transformRequest(claudeRequest);
          await this.claudeSDK.executeStream(prompt, {
            requestId,
            onChunk,
            timeout: 60000,
            ...sdkOptions
          });
          break;
          
        case 'cli':
          // CLI streaming fallback
          this.logger.info(`[${requestId}] Using Claude Code CLI streaming fallback (MAX subscription)`);
          const cliPrompt = this.claudeCLI.transformRequest(claudeRequest);
          await this.claudeCLI.executeStream(cliPrompt, {
            model: claudeRequest.model,
            timeout: 60000,
            onChunk
          });
          break;
          
        default:
          throw new Error(`No authentication method available for streaming. Current method: ${this.authMethod}. Please provide ANTHROPIC_API_KEY or install Claude Code SDK/CLI.`);
      }
      
    } catch (error) {
      this.logger.warn(`[${requestId}] Streaming attempt ${attempt} failed:`, error.message);
      
      // Check if we should retry
      if (attempt < this.options.retryAttempts && this.isRetryableError(error)) {
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.logger.info(`[${requestId}] Retrying streaming in ${delay}ms...`);
        
        await this.sleep(delay);
        return this.executeStreamWithRetry(claudeRequest, requestId, onChunk, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * 🌊 Stream Anthropic API responses
   */
  async streamAnthropicAPI(claudeRequest, requestId, onChunk) {
    const stream = await this.anthropic.messages.create({
      ...claudeRequest,
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        // Send content as it arrives
        const text = chunk.delta?.text || '';
        if (text) {
          onChunk(text, 'content');
        }
      } else if (chunk.type === 'message_start') {
        onChunk('', 'start');
      } else if (chunk.type === 'message_stop') {
        onChunk('', 'stop');
      }
    }
  }

  /**
   * ⚡ Execute request with retry logic
   */
  async executeWithRetry(claudeRequest, requestId, attempt = 1) {
    try {
      this.logger.debug(`[${requestId}] Executing Claude request (attempt ${attempt}) via ${this.authMethod}`);
      
      let response;
      
      switch (this.authMethod) {
        case 'api':
          // Anthropic API (highest priority)
          response = await this.anthropic.messages.create(claudeRequest);
          this.logger.debug(`[${requestId}] Claude API request successful`, {
            model: response.model,
            usage: response.usage,
          });
          break;
          
        case 'sdk':
          // TypeScript SDK (preferred for MAX)
          this.logger.info(`[${requestId}] Using Claude Code TypeScript SDK (MAX subscription)`);
          const { prompt, sdkOptions } = this.claudeSDK.transformRequest(claudeRequest);
          const sdkResponse = await this.claudeSDK.execute(prompt, {
            requestId,
            timeout: 60000,
            ...sdkOptions
          });
          
          // SDK response is already in API format
          response = sdkResponse;
          break;
          
        case 'cli':
          // CLI fallback
          this.logger.info(`[${requestId}] Using Claude Code CLI fallback (MAX subscription)`);
          const cliPrompt = this.claudeCLI.transformRequest(claudeRequest);
          const cliResponse = await this.claudeCLI.execute(cliPrompt, {
            model: claudeRequest.model,
            timeout: 60000
          });
          
          // Transform CLI response to API format
          response = {
            content: [{ type: 'text', text: cliResponse.content }],
            model: cliResponse.model,
            usage: cliResponse.usage,
            role: 'assistant',
            type: 'message'
          };
          break;
          
        default:
          throw new Error(`No authentication method available. Current method: ${this.authMethod}. Please provide ANTHROPIC_API_KEY or install Claude Code SDK/CLI.`);
      }
      
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
    const authStatus = await this.getAuthStatus();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.metrics.uptime,
      authMethod: this.authMethod,
      authentication: authStatus,
      cache: this.cache ? {
        enabled: true,
        keys: this.cache.keys().length,
        stats: this.cache.getStats(),
      } : { enabled: false },
      defaultModel: this.options.defaultModel,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * 🔐 Get authentication status for all methods
   */
  async getAuthStatus() {
    const status = {
      current: this.authMethod,
      available: {}
    };

    // Check API key
    status.available.api = {
      available: !!this.options.anthropicApiKey,
      configured: !!this.anthropic,
      note: this.options.anthropicApiKey ? 'API key configured' : 'No API key provided'
    };

    // Check TypeScript SDK
    if (this.claudeSDK) {
      status.available.sdk = await this.claudeSDK.getStatus();
    } else {
      status.available.sdk = {
        available: false,
        note: 'TypeScript SDK not initialized'
      };
    }

    // Check CLI
    if (this.claudeCLI) {
      status.available.cli = {
        available: await this.claudeCLI.isAvailable(),
        note: 'Claude Code CLI available'
      };
    } else {
      status.available.cli = {
        available: false,
        note: 'Claude Code CLI not initialized'
      };
    }

    return status;
  }

  /**
   * 🎯 Get proxy capabilities
   */
  getCapabilities() {
    return {
      authMethods: ['api', 'sdk', 'cli'],
      outputFormats: ['text', 'json', 'stream-json'],
      streaming: {
        supported: this.authMethod !== 'none',
        sseSupport: true, // Server-Sent Events
        realTimeChunks: true,
        formats: ['text/plain', 'text/event-stream']
      },
      maxSubscription: this.authMethod !== 'api',
      caching: this.options.cacheEnabled,
      retryLogic: true,
      rateLimit: true,
      multiTurn: this.authMethod === 'sdk',
      mcpServers: this.authMethod === 'sdk',
      allowedTools: this.authMethod !== 'none'
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