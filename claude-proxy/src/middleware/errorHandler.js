import { Logger } from '../utils/logger.js';

export class ErrorHandler {
  static get middleware() {
    const logger = new Logger();
    
    return (error, req, res, next) => {
      // Log error details
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id'],
      });

      // Determine error status and message
      let status = error.status || error.statusCode || 500;
      let message = error.message || 'Internal server error';

      // Handle specific error types
      if (error.name === 'ValidationError') {
        status = 400;
        message = 'Invalid request data';
      } else if (error.name === 'UnauthorizedError') {
        status = 401;
        message = 'Unauthorized access';
      } else if (error.code === 'ECONNREFUSED') {
        status = 503;
        message = 'Service temporarily unavailable';
      } else if (error.code === 'ENOTFOUND') {
        status = 502;
        message = 'External service unreachable';
      }

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production' && status >= 500) {
        message = 'Internal server error';
      }

      // Send error response
      res.status(status).json({
        error: message,
        status,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        ...(process.env.NODE_ENV !== 'production' && { 
          stack: error.stack,
          details: error.details 
        }),
      });
    };
  }
}