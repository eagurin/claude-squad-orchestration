#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ClaudeProxyBridge } from './bridge.js';
import { Logger } from './utils/logger.js';
import { RateLimiter } from './middleware/rateLimiter.js';
import { AuthMiddleware } from './middleware/auth.js';
import { ErrorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const logger = new Logger();

// Initialize Claude Proxy Bridge
const claudeBridge = new ClaudeProxyBridge({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  cacheTtl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
});

// Security and CORS middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
const rateLimiter = new RateLimiter();
app.use('/api', rateLimiter.middleware);

// Apply authentication
const auth = new AuthMiddleware();
app.use('/api', auth.middleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

// API status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const status = await claudeBridge.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// 🎯 Main Claude API compatibility endpoint
app.post('/api/claude/messages', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info(`[${requestId}] Claude API request started`, {
    model: req.body.model,
    max_tokens: req.body.max_tokens,
    user_agent: req.headers['user-agent'],
  });

  try {
    const response = await claudeBridge.proxyRequest({
      ...req.body,
      requestId,
      headers: req.headers,
    });

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Claude API request completed in ${duration}ms`);

    res.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Claude API request failed after ${duration}ms:`, error);
    
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
      requestId,
      duration,
    });
  }
});

// 🔄 GitHub Actions specific endpoint
app.post('/api/github-actions/claude', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `gha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info(`[${requestId}] GitHub Actions Claude request started`, {
    action: req.body.action || 'chat',
    repository: req.headers['x-github-repository'],
    workflow: req.headers['x-github-workflow'],
    stream: req.body.stream || false,
  });

  try {
    // Transform GitHub Actions format to Claude API format
    const claudeRequest = claudeBridge.transformGitHubActionsRequest(req.body);
    
    // Check if streaming is requested
    if (req.body.stream === true) {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-ID': requestId,
      });

      // Stream the response
      await claudeBridge.proxyRequestStream({
        ...claudeRequest,
        requestId,
        headers: req.headers,
        isGitHubActions: true,
        stream: true,
      }, (chunk) => {
        // Send each chunk as it comes
        res.write(chunk);
      });

      const duration = Date.now() - startTime;
      logger.info(`[${requestId}] GitHub Actions Claude stream completed in ${duration}ms`);
      res.end();
      return;
    }

    // Non-streaming request (existing logic)
    const response = await claudeBridge.proxyRequest({
      ...claudeRequest,
      requestId,
      headers: req.headers,
      isGitHubActions: true,
    });

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] GitHub Actions Claude request completed in ${duration}ms`);

    // Transform response back to GitHub Actions format
    const transformedResponse = claudeBridge.transformGitHubActionsResponse(response);
    res.json(transformedResponse);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] GitHub Actions Claude request failed after ${duration}ms:`, error);
    
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
      requestId,
      duration,
      action: 'error',
    });
  }
});

// 🌊 Streaming endpoint for Claude API
app.post('/api/claude/messages/stream', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info(`[${requestId}] Claude API stream request started`, {
    model: req.body.model,
    max_tokens: req.body.max_tokens,
  });

  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Request-ID': requestId,
    });

    // Send initial connection event
    res.write(`data: {"type":"connection","request_id":"${requestId}"}\n\n`);

    // Stream the response
    await claudeBridge.proxyRequestStream({
      ...req.body,
      requestId,
      headers: req.headers,
      stream: true,
    }, (chunk, type = 'content') => {
      // Send Server-Sent Events format
      res.write(`data: ${JSON.stringify({
        type,
        content: chunk,
        request_id: requestId,
        timestamp: new Date().toISOString()
      })}\n\n`);
    });

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Claude API stream completed in ${duration}ms`);
    
    // Send completion event
    res.write(`data: {"type":"complete","request_id":"${requestId}","duration":${duration}}\n\n`);
    res.end();
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Claude API stream failed after ${duration}ms:`, error);
    
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || 'Stream failed',
      request_id: requestId,
      duration
    })}\n\n`);
    res.end();
  }
});

// 📊 Analytics and metrics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await claudeBridge.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics request failed:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// 🧹 Cache management endpoints
app.delete('/api/cache', async (req, res) => {
  try {
    await claudeBridge.clearCache();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error('Cache clear failed:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await claudeBridge.getCacheStats();
    res.json(stats);
  } catch (error) {
    logger.error('Cache stats request failed:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Error handling middleware
app.use(ErrorHandler.middleware);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(port, () => {
  logger.info(`🚀 Claude Proxy Bridge server running on port ${port}`);
  logger.info(`📊 Health check: http://localhost:${port}/health`);
  logger.info(`🎯 Claude API: http://localhost:${port}/api/claude/messages`);
  logger.info(`🔄 GitHub Actions: http://localhost:${port}/api/github-actions/claude`);
});

export default app;