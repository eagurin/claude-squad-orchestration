import { query } from '@anthropic-ai/claude-code';
import { Logger } from './utils/logger.js';

/**
 * Official Claude Code TypeScript SDK integration
 * Better than CLI as it provides structured output and control
 */
export class ClaudeCodeSDK {
  constructor(options = {}) {
    this.options = {
      maxTurns: options.maxTurns || 3,
      outputFormat: options.outputFormat || 'json',
      cwd: options.cwd || process.cwd(),
      allowedTools: options.allowedTools || [],
      systemPrompt: options.systemPrompt || null,
      mcpConfig: options.mcpConfig || null,
      ...options
    };
    
    this.logger = new Logger();
    this.logger.info('🔗 Claude Code SDK initialized', {
      maxTurns: this.options.maxTurns,
      outputFormat: this.options.outputFormat,
      toolsCount: this.options.allowedTools.length
    });
  }

  /**
   * Execute query using official Claude Code SDK
   */
  async execute(prompt, options = {}) {
    const startTime = Date.now();
    const requestId = options.requestId || `sdk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info(`[${requestId}] Executing Claude Code SDK query`);
    
    try {
      const messages = [];
      const abortController = new AbortController();
      
      // Setup timeout
      const timeout = options.timeout || 60000; // 60 seconds default
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeout);
      
      // Prepare query options
      const queryOptions = {
        maxTurns: options.maxTurns || this.options.maxTurns,
        outputFormat: options.outputFormat || this.options.outputFormat,
        cwd: options.cwd || this.options.cwd,
        allowedTools: options.allowedTools || this.options.allowedTools,
        systemPrompt: options.systemPrompt || this.options.systemPrompt,
        mcpConfig: options.mcpConfig || this.options.mcpConfig,
        ...options.sdkOptions
      };
      
      this.logger.debug(`[${requestId}] Query options`, queryOptions);
      
      // Execute query
      for await (const message of query({
        prompt,
        abortController,
        options: queryOptions
      })) {
        messages.push(message);
        
        // Log progress
        if (message.type === 'assistant') {
          this.logger.debug(`[${requestId}] Assistant message received`, {
            contentLength: message.message?.content?.[0]?.text?.length || 0
          });
        } else if (message.type === 'result') {
          this.logger.info(`[${requestId}] Query completed`, {
            subtype: message.subtype,
            duration: message.duration_ms,
            turns: message.num_turns,
            cost: message.total_cost_usd
          });
        }
      }
      
      clearTimeout(timeoutId);
      
      // Process result
      const result = this.processMessages(messages, requestId);
      const duration = Date.now() - startTime;
      
      this.logger.info(`[${requestId}] SDK execution completed in ${duration}ms`);
      
      return {
        ...result,
        requestId,
        duration,
        source: 'sdk',
        messages: options.includeMessages ? messages : undefined
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${requestId}] SDK execution failed after ${duration}ms:`, error);
      
      throw {
        status: 500,
        message: error.message || 'Claude Code SDK execution failed',
        requestId,
        duration,
        source: 'sdk'
      };
    }
  }

  /**
   * Process SDK messages into API-compatible format
   */
  processMessages(messages, requestId) {
    const resultMessage = messages.find(m => m.type === 'result');
    const assistantMessages = messages.filter(m => m.type === 'assistant');
    const initMessage = messages.find(m => m.type === 'system' && m.subtype === 'init');
    
    // Extract final response
    let response = '';
    if (resultMessage && resultMessage.subtype === 'success') {
      response = resultMessage.result;
    } else if (assistantMessages.length > 0) {
      // Fallback to last assistant message
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      response = lastAssistant.message?.content?.[0]?.text || '';
    }
    
    // Build usage info
    const usage = {
      total_cost_usd: resultMessage?.total_cost_usd || 0,
      duration_ms: resultMessage?.duration_ms || 0,
      duration_api_ms: resultMessage?.duration_api_ms || 0,
      num_turns: resultMessage?.num_turns || 0,
      subscription: 'MAX' // Assuming MAX subscription when using SDK
    };
    
    // Build response metadata
    const metadata = {
      session_id: resultMessage?.session_id || `sdk_${requestId}`,
      model: initMessage?.model || 'claude-sonnet-4',
      tools: initMessage?.tools || [],
      mcp_servers: initMessage?.mcp_servers || [],
      permission_mode: initMessage?.permissionMode || 'default',
      api_key_source: initMessage?.apiKeySource || 'MAX_subscription'
    };
    
    return {
      content: [{ type: 'text', text: response }],
      model: metadata.model,
      usage,
      metadata,
      role: 'assistant',
      type: 'message',
      success: resultMessage?.subtype === 'success',
      is_error: resultMessage?.is_error || false
    };
  }

  /**
   * Transform API request to SDK format
   */
  transformRequest(apiRequest) {
    let prompt = '';
    
    // Handle different input formats
    if (apiRequest.messages && Array.isArray(apiRequest.messages)) {
      // API messages format
      prompt = apiRequest.messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join('\n\n');
    } else if (apiRequest.direct_prompt) {
      prompt = apiRequest.direct_prompt;
    } else if (apiRequest.prompt) {
      prompt = apiRequest.prompt;
    }
    
    // Build SDK options
    const sdkOptions = {
      maxTurns: apiRequest.max_turns || this.options.maxTurns,
      outputFormat: 'json', // Always use JSON for structured output
      allowedTools: this.parseAllowedTools(apiRequest.allowed_tools),
      systemPrompt: apiRequest.system_prompt || apiRequest.system,
      permissionMode: apiRequest.permission_mode || 'default'
    };
    
    // Add MCP config if provided
    if (apiRequest.mcp_config || this.options.mcpConfig) {
      sdkOptions.mcpConfig = apiRequest.mcp_config || this.options.mcpConfig;
    }
    
    return {
      prompt,
      sdkOptions
    };
  }

  /**
   * Parse allowed tools string/array into SDK format
   */
  parseAllowedTools(allowedTools) {
    if (!allowedTools) return [];
    
    if (typeof allowedTools === 'string') {
      // Parse comma-separated or space-separated tools
      return allowedTools
        .split(/[,\s]+/)
        .map(tool => tool.trim())
        .filter(tool => tool.length > 0);
    }
    
    if (Array.isArray(allowedTools)) {
      return allowedTools;
    }
    
    return [];
  }

  /**
   * Transform SDK response to API format
   */
  transformResponse(sdkResponse, githubActions = false) {
    if (githubActions) {
      // GitHub Actions format
      return {
        action: 'response',
        success: sdkResponse.success,
        response: sdkResponse.content?.[0]?.text || '',
        usage: sdkResponse.usage,
        model: sdkResponse.model,
        metadata: {
          ...sdkResponse.metadata,
          responseTime: sdkResponse.duration,
          fromSDK: true,
          source: 'sdk'
        }
      };
    } else {
      // Standard API format
      return {
        ...sdkResponse,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if SDK is available
   */
  async isAvailable() {
    try {
      // Try to import and use the SDK
      const { query } = await import('@anthropic-ai/claude-code');
      return typeof query === 'function';
    } catch (error) {
      this.logger.warn('Claude Code SDK not available:', error.message);
      return false;
    }
  }

  /**
   * Get SDK status and configuration
   */
  async getStatus() {
    const available = await this.isAvailable();
    
    return {
      available,
      version: available ? '1.0.33' : 'not_installed',
      options: available ? this.options : null,
      note: available 
        ? 'Official Claude Code TypeScript SDK ready'
        : 'SDK not available - install @anthropic-ai/claude-code'
    };
  }
}