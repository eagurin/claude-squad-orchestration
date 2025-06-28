import { spawn } from 'child_process';
import { Logger } from './utils/logger.js';

/**
 * Bridge to use Claude Code CLI (for MAX subscribers)
 * instead of API keys
 */
export class ClaudeCodeCLI {
  constructor() {
    this.logger = new Logger();
  }

  /**
   * Check if Claude Code CLI is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const check = spawn('which', ['claude']);
      check.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  /**
   * Execute Claude Code CLI command
   */
  async execute(prompt, options = {}) {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new Error('Claude Code CLI not found. Please install: curl -fsSL https://api.claude.ai/install.sh | sh');
    }

    return new Promise((resolve, reject) => {
      const args = [];
      
      // Add model selection if specified
      if (options.model) {
        args.push('--model', options.model);
      }
      
      // Add the prompt
      args.push(prompt);
      
      this.logger.info('Executing Claude Code CLI', { args: args.length });
      
      const claude = spawn('claude', args, {
        env: {
          ...process.env,
          CLAUDE_OUTPUT: 'json', // Request JSON output if supported
        }
      });
      
      let output = '';
      let error = '';
      
      claude.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      claude.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      claude.on('close', (code) => {
        if (code === 0) {
          this.logger.info('Claude Code CLI executed successfully');
          resolve({
            content: output.trim(),
            model: options.model || 'claude-max',
            source: 'cli',
            usage: {
              note: 'Usage tracked by MAX subscription',
              subscription: 'MAX'
            }
          });
        } else {
          this.logger.error('Claude Code CLI failed', { code, error });
          reject(new Error(`Claude Code CLI failed: ${error || 'Unknown error'}`));
        }
      });
      
      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          claude.kill('SIGTERM');
          reject(new Error('Claude Code CLI timeout'));
        }, options.timeout);
      }
    });
  }

  /**
   * Transform API-style request to CLI prompt
   */
  transformRequest(apiRequest) {
    let prompt = '';
    
    // Handle messages format
    if (apiRequest.messages && Array.isArray(apiRequest.messages)) {
      prompt = apiRequest.messages
        .map(msg => {
          if (msg.role === 'system') {
            return `System: ${msg.content}`;
          } else if (msg.role === 'assistant') {
            return `Assistant: ${msg.content}`;
          } else {
            return msg.content;
          }
        })
        .join('\n\n');
    } else if (apiRequest.prompt) {
      prompt = apiRequest.prompt;
    } else if (apiRequest.direct_prompt) {
      prompt = apiRequest.direct_prompt;
    }
    
    return prompt;
  }
}