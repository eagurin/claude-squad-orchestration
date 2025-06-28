# 🐳 Multi-stage Docker build for Claude Proxy Bridge
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Create logs directory
RUN mkdir -p logs

# Production stage
FROM node:18-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S claude -u 1001

# Set working directory
WORKDIR /app

# Copy from builder stage
COPY --from=builder --chown=claude:nodejs /app .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R claude:nodejs logs

# Switch to non-root user
USER claude

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "
    const http = require('http');
    const options = {
      host: 'localhost',
      port: 3000,
      path: '/health',
      timeout: 2000
    };
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) process.exit(0);
      else process.exit(1);
    });
    req.on('error', () => process.exit(1));
    req.end();
  "

# Start the application
CMD ["npm", "start"]