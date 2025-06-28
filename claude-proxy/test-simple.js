#!/usr/bin/env node

// Simple test of Claude proxy without API key
import express from 'express';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', mode: 'CLI' });
});

// Test Claude CLI directly
app.post('/test-cli', async (req, res) => {
  const { prompt = 'Say hello' } = req.body;
  
  console.log('🔍 Testing Claude CLI with prompt:', prompt);
  
  try {
    const claude = spawn('claude', [prompt], {
      timeout: 30000 // 30 second timeout
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
      console.log(`Claude CLI exited with code ${code}`);
      if (code === 0) {
        res.json({ 
          success: true, 
          response: output.trim(),
          mode: 'CLI'
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: error || 'Claude CLI failed',
          code 
        });
      }
    });
    
    claude.on('error', (err) => {
      console.error('Failed to start Claude CLI:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to start Claude CLI: ' + err.message 
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`🧪 Test server running on http://localhost:${port}`);
  console.log(`📡 Test CLI endpoint: POST http://localhost:${port}/test-cli`);
});

// Test immediately
setTimeout(async () => {
  console.log('\n📋 Running self-test...');
  try {
    const response = await fetch(`http://localhost:${port}/test-cli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Say "Hello from Claude MAX!" and nothing else' })
    });
    const result = await response.json();
    console.log('📨 Test result:', result);
  } catch (error) {
    console.error('❌ Self-test failed:', error.message);
  }
}, 1000);