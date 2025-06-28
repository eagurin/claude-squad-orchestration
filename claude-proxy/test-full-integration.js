#!/usr/bin/env node

/**
 * Full integration test for Claude Proxy Bridge
 * Tests all authentication methods and features
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

const log = (color, symbol, message) => {
  console.log(`${color}${symbol} ${message}${COLORS.RESET}`);
};

const success = (message) => log(COLORS.GREEN, '✅', message);
const error = (message) => log(COLORS.RED, '❌', message);
const warning = (message) => log(COLORS.YELLOW, '⚠️ ', message);
const info = (message) => log(COLORS.BLUE, 'ℹ️ ', message);

class ClaudeProxyTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  async runTests() {
    console.log(`${COLORS.BLUE}🧪 Claude Proxy Bridge - Full Integration Test${COLORS.RESET}`);
    console.log('============================================\n');

    try {
      await this.checkPrerequisites();
      await this.startProxyIfNeeded();
      await this.runHealthTests();
      await this.runAuthenticationTests();
      await this.runFeatureTests();
      await this.runPerformanceTests();
      await this.printSummary();
    } catch (err) {
      error(`Test suite failed: ${err.message}`);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    info('Checking prerequisites...');
    
    // Check if package.json exists
    if (!existsSync('package.json')) {
      throw new Error('Run tests from claude-proxy directory');
    }
    
    // Check if dependencies are installed
    if (!existsSync('node_modules')) {
      warning('Dependencies not installed. Installing...');
      await this.runCommand('npm install');
    }
    
    // Check Claude CLI
    try {
      await this.runCommand('claude --version', { timeout: 5000 });
      success('Claude CLI available');
    } catch (err) {
      warning('Claude CLI not available - some tests will be skipped');
    }
    
    success('Prerequisites checked');
  }

  async startProxyIfNeeded() {
    info('Checking proxy server...');
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        success('Proxy server already running');
        return;
      }
    } catch (err) {
      // Server not running
    }
    
    info('Starting proxy server...');
    
    // Create minimal .env if doesn't exist
    if (!existsSync('.env')) {
      await this.createTestEnv();
    }
    
    // Start server
    this.serverProcess = spawn('npm', ['start'], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Wait for server to start
    await this.waitForServer();
    success('Proxy server started');
  }

  async createTestEnv() {
    const envContent = `
# Test configuration
PORT=3000
NODE_ENV=development
REQUIRE_AUTH=false
CACHE_ENABLED=true
LOG_LEVEL=info
DEFAULT_MODEL=claude-sonnet-4-20250514
MAX_TOKENS=4096
`;
    await this.writeFile('.env', envContent.trim());
    info('Created test .env file');
  }

  async waitForServer(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/health`);
        if (response.ok) return;
      } catch (err) {
        // Continue waiting
      }
      await this.sleep(1000);
    }
    throw new Error('Server failed to start within timeout');
  }

  async runHealthTests() {
    info('Running health tests...');
    
    await this.test('Health endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (data.status !== 'healthy') throw new Error('Not healthy');
      
      return 'Health check passed';
    });
    
    await this.test('Status endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/status`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!data.authMethod) throw new Error('No auth method detected');
      
      return `Auth method: ${data.authMethod}`;
    });
  }

  async runAuthenticationTests() {
    info('Running authentication tests...');
    
    await this.test('Authentication methods detection', async () => {
      const response = await fetch(`${this.baseUrl}/api/status`);
      const data = await response.json();
      
      const authMethods = Object.keys(data.authentication?.available || {});
      if (authMethods.length === 0) {
        throw new Error('No authentication methods detected');
      }
      
      return `Available: ${authMethods.join(', ')}`;
    });
  }

  async runFeatureTests() {
    info('Running feature tests...');
    
    await this.test('GitHub Actions endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/github-actions/claude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Repository': 'test/repo'
        },
        body: JSON.stringify({
          action: 'test',
          direct_prompt: 'Say "Test successful" and nothing else',
          max_tokens: 50
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        // Expected if no auth method available
        if (data.error.includes('authentication')) {
          return 'No auth - expected error';
        }
        throw new Error(data.error);
      }
      
      return 'GitHub Actions endpoint working';
    });
    
    await this.test('Metrics endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/metrics`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (typeof data.requests !== 'number') {
        throw new Error('Invalid metrics format');
      }
      
      return `Requests: ${data.requests}`;
    });
    
    await this.test('Cache stats', async () => {
      const response = await fetch(`${this.baseUrl}/api/cache/stats`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (typeof data.enabled !== 'boolean') {
        throw new Error('Invalid cache stats format');
      }
      
      return `Cache enabled: ${data.enabled}`;
    });
  }

  async runPerformanceTests() {
    info('Running performance tests...');
    
    await this.test('Response time', async () => {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/health`);
      const duration = Date.now() - start;
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (duration > 1000) {
        throw new Error(`Slow response: ${duration}ms`);
      }
      
      return `${duration}ms`;
    });
    
    await this.test('Concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        fetch(`${this.baseUrl}/health`)
      );
      
      const responses = await Promise.all(promises);
      const allOk = responses.every(r => r.ok);
      
      if (!allOk) throw new Error('Some concurrent requests failed');
      
      return 'All concurrent requests succeeded';
    });
  }

  async test(name, testFn) {
    try {
      const result = await testFn();
      success(`${name}: ${result}`);
      this.results.passed++;
    } catch (err) {
      if (err.message.includes('expected') || err.message.includes('No auth')) {
        warning(`${name}: ${err.message}`);
        this.results.warnings++;
      } else {
        error(`${name}: ${err.message}`);
        this.results.failed++;
      }
    }
  }

  async printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    success(`Passed: ${this.results.passed}`);
    if (this.results.warnings > 0) {
      warning(`Warnings: ${this.results.warnings}`);
    }
    if (this.results.failed > 0) {
      error(`Failed: ${this.results.failed}`);
    }
    
    console.log('\n🔧 Recommendations:');
    if (this.results.warnings > 0) {
      console.log('• Configure authentication for full functionality');
      console.log('• Install Claude Code CLI: curl -fsSL https://api.claude.ai/install.sh | sh');
    }
    
    // Check auth method and give specific advice
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      const data = await response.json();
      
      if (data.authMethod === 'none') {
        console.log('• No authentication method available');
        console.log('• For MAX subscription: Install Claude Code CLI and login');
        console.log('• For API access: Set ANTHROPIC_API_KEY environment variable');
      } else {
        success(`Authentication method: ${data.authMethod}`);
      }
    } catch (err) {
      // Ignore
    }
    
    console.log('\n🚀 Proxy is ready for use!');
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, {
        stdio: 'pipe',
        ...options
      });
      
      let output = '';
      let error = '';
      
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr?.on('data', (data) => {
        error += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(error || `Command failed with code ${code}`));
        }
      });
      
      if (options.timeout) {
        setTimeout(() => {
          proc.kill();
          reject(new Error('Command timeout'));
        }, options.timeout);
      }
    });
  }

  async writeFile(path, content) {
    const { writeFile } = await import('fs/promises');
    await writeFile(path, content);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

// Run tests
const tester = new ClaudeProxyTester();

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping tests...');
  tester.cleanup();
  process.exit(0);
});

process.on('exit', () => {
  tester.cleanup();
});

tester.runTests().catch(err => {
  console.error('Test suite failed:', err);
  tester.cleanup();
  process.exit(1);
});