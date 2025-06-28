#!/usr/bin/env node

/**
 * Test streaming functionality of Claude Proxy Bridge
 */

import fetch from 'node-fetch';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m'
};

const log = (color, symbol, message) => {
  console.log(`${color}${symbol} ${message}${COLORS.RESET}`);
};

const success = (message) => log(COLORS.GREEN, '✅', message);
const error = (message) => log(COLORS.RED, '❌', message);
const info = (message) => log(COLORS.BLUE, 'ℹ️ ', message);
const stream = (message) => log(COLORS.CYAN, '🌊', message);

class StreamTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async testGitHubActionsStream() {
    info('Testing GitHub Actions streaming endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/github-actions/claude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Repository': 'test/repo'
        },
        body: JSON.stringify({
          action: 'test',
          stream: true,
          direct_prompt: 'Write a short story about a robot learning to dance. Make it creative and fun!',
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      stream('Streaming response:');
      console.log(COLORS.CYAN + '=' * 50 + COLORS.RESET);
      
      let totalChunks = 0;
      let totalContent = '';
      
      // Read the stream
      const reader = response.body;
      reader.on('data', (chunk) => {
        const text = chunk.toString();
        totalContent += text;
        totalChunks++;
        process.stdout.write(COLORS.CYAN + text + COLORS.RESET);
      });

      return new Promise((resolve, reject) => {
        reader.on('end', () => {
          console.log('\n' + COLORS.CYAN + '=' * 50 + COLORS.RESET);
          success(`Stream completed! Received ${totalChunks} chunks, ${totalContent.length} characters`);
          resolve({ chunks: totalChunks, content: totalContent });
        });

        reader.on('error', (err) => {
          error(`Stream error: ${err.message}`);
          reject(err);
        });
      });

    } catch (err) {
      error(`GitHub Actions stream test failed: ${err.message}`);
      throw err;
    }
  }

  async testServerSentEvents() {
    info('Testing Server-Sent Events streaming...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/claude/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Count from 1 to 10 with short explanations for each number.'
            }
          ],
          model: 'claude-sonnet-4-20250514',
          max_tokens: 250
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      stream('Server-Sent Events stream:');
      console.log(COLORS.CYAN + '=' * 50 + COLORS.RESET);
      
      let eventCount = 0;
      let contentChunks = [];
      
      // Read SSE stream
      const reader = response.body;
      let buffer = '';
      
      reader.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Parse SSE format
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              eventCount++;
              
              if (data.type === 'content' && data.content) {
                contentChunks.push(data.content);
                process.stdout.write(COLORS.CYAN + data.content + COLORS.RESET);
              } else if (data.type === 'connection') {
                stream(`Connected with request ID: ${data.request_id}`);
              } else if (data.type === 'complete') {
                stream(`Stream completed in ${data.duration}ms`);
              } else if (data.type === 'error') {
                error(`Stream error: ${data.error}`);
              }
            } catch (parseErr) {
              // Ignore invalid JSON
            }
          }
        }
      });

      return new Promise((resolve, reject) => {
        reader.on('end', () => {
          console.log('\n' + COLORS.CYAN + '=' * 50 + COLORS.RESET);
          success(`SSE stream completed! Received ${eventCount} events, content: ${contentChunks.join('')}`);
          resolve({ events: eventCount, content: contentChunks.join('') });
        });

        reader.on('error', (err) => {
          error(`SSE stream error: ${err.message}`);
          reject(err);
        });
      });

    } catch (err) {
      error(`SSE stream test failed: ${err.message}`);
      throw err;
    }
  }

  async testCapabilities() {
    info('Testing streaming capabilities...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      const status = await response.json();
      
      if (status.capabilities?.streaming?.supported) {
        success('Streaming is supported!');
        console.log(`  - SSE Support: ${status.capabilities.streaming.sseSupport}`);
        console.log(`  - Real-time chunks: ${status.capabilities.streaming.realTimeChunks}`);
        console.log(`  - Formats: ${status.capabilities.streaming.formats.join(', ')}`);
      } else {
        error('Streaming not supported or capabilities not found');
      }
      
    } catch (err) {
      error(`Capabilities test failed: ${err.message}`);
    }
  }

  async runAllTests() {
    console.log(`${COLORS.BLUE}🌊 Claude Proxy Streaming Test Suite${COLORS.RESET}`);
    console.log('=========================================\n');

    try {
      // Test capabilities first
      await this.testCapabilities();
      console.log();

      // Test GitHub Actions streaming
      await this.testGitHubActionsStream();
      console.log();

      // Test Server-Sent Events streaming
      await this.testServerSentEvents();
      console.log();

      success('All streaming tests completed successfully! 🎉');
      
    } catch (err) {
      error(`Test suite failed: ${err.message}`);
      process.exit(1);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    error('Claude Proxy server is not running on localhost:3000');
    info('Start the server with: npm start');
    process.exit(1);
  }

  const tester = new StreamTester();
  await tester.runAllTests();
})();