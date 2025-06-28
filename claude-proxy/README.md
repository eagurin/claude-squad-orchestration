# 🔗 Claude Proxy Bridge

Local proxy bridge for Claude Code SDK to GitHub Actions compatibility layer.

## 🎯 Overview

This proxy bridge provides a **local compatibility API** between GitHub Actions and the Claude AI API, enabling:

- 🛡️ **Reliable workflows** with retry logic and error handling
- 💾 **Smart caching** to reduce API costs and improve performance  
- 🔒 **Local security** with configurable authentication
- 📊 **Comprehensive monitoring** and metrics
- 🚀 **Easy integration** with existing GitHub Actions

## 🏗️ Architecture

```
GitHub Actions → Local Proxy Bridge → Claude API
                      ↓
                 [Cache + Retry + Monitoring]
```

### Key Components

- **Express Server**: REST API endpoints for GitHub Actions
- **Claude SDK Integration**: Official Anthropic SDK for API calls
- **Caching Layer**: Redis-compatible caching with TTL
- **Rate Limiting**: Configurable limits per endpoint
- **Authentication**: Multiple auth methods (API keys, tokens)
- **Monitoring**: Metrics, logging, and health checks

## 🚀 Quick Start

### 1. Setup

```bash
# Clone and navigate to proxy directory
cd claude-proxy

# Run setup script
chmod +x scripts/local-setup.sh
./scripts/local-setup.sh

# Edit configuration
cp .env.example .env
# Add your ANTHROPIC_API_KEY and other settings
```

### 2. Configuration

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...

# Server
PORT=3000
NODE_ENV=development

# Security  
REQUIRE_AUTH=true
AUTHORIZED_API_KEYS=your-generated-key

# Caching
CACHE_ENABLED=true
CACHE_TTL=300

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900
```

### 3. Start the Server

```bash
# Development
npm run dev

# Production
npm start

# Docker
docker-compose up -d
```

### 4. Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# Status check
curl http://localhost:3000/api/status
```

## 📡 API Endpoints

### Core Endpoints

- **GET /health** - Health check
- **GET /api/status** - Detailed status and configuration
- **POST /api/claude/messages** - Standard Claude API compatibility
- **POST /api/github-actions/claude** - GitHub Actions optimized endpoint

### Monitoring

- **GET /api/metrics** - Performance and usage metrics
- **GET /api/cache/stats** - Cache performance statistics
- **DELETE /api/cache** - Clear cache (auth required)

### Example GitHub Actions Request

```bash
curl -X POST http://localhost:3000/api/github-actions/claude \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Repository: owner/repo" \
  -d '{
    "action": "chat",
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 4096,
    "direct_prompt": "Review this code...",
    "context": {
      "repository": "owner/repo",
      "pr_number": 123
    }
  }'
```

## 🔧 GitHub Actions Integration

### Basic Integration

```yaml
# .github/workflows/claude-with-proxy.yml
- name: Start Claude Proxy
  run: |
    cd claude-proxy
    npm ci
    npm start &
    # Wait for readiness...

- name: Use Claude via Proxy
  run: |
    curl -X POST http://localhost:3000/api/github-actions/claude \
      -H "Content-Type: application/json" \
      -d '{"direct_prompt": "${{ github.event.comment.body }}"}'
```

### Advanced Integration

See the included workflow files:
- `.github/workflows/claude-proxy.yml` - Interactive Claude chat
- `.github/workflows/claude-proxy-review.yml` - Automated PR reviews

## 🐳 Docker Deployment

### Local Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f claude-proxy

# Scale if needed
docker-compose up -d --scale claude-proxy=2
```

### Production Docker

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  claude-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

## 🔒 Security

### Authentication Methods

1. **API Keys** - Set in `AUTHORIZED_API_KEYS`
2. **Bearer Tokens** - Standard `Authorization: Bearer <token>`
3. **GitHub Tokens** - For GitHub Actions via `X-GitHub-Token`
4. **Local Development** - Auto-allowed for local IPs

### Security Headers

- **Helmet.js** protection
- **CORS** configuration
- **Rate limiting** per IP/repository
- **Request validation**

### Best Practices

```bash
# Generate secure API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Use environment variables for secrets
export ANTHROPIC_API_KEY="sk-ant-..."
export AUTHORIZED_API_KEYS="your-secure-key"

# Enable authentication in production
export REQUIRE_AUTH=true
```

## 📊 Monitoring & Metrics

### Available Metrics

```json
{
  "requests": 1234,
  "cacheHits": 456,
  "cacheMisses": 123,
  "errors": 5,
  "totalTokens": 789012,
  "averageResponseTime": 1250,
  "uptime": 86400000
}
```

### Health Monitoring

```bash
# Basic health
curl http://localhost:3000/health

# Detailed status
curl http://localhost:3000/api/status

# Cache performance
curl http://localhost:3000/api/cache/stats
```

### Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (development)

## 🔧 Advanced Configuration

### Custom Models

```bash
# Use different default model
DEFAULT_MODEL=claude-opus-4-20250514

# Override in requests
{
  "model": "claude-haiku-3-5-20241022",
  "max_tokens": 1024
}
```

### Caching Strategy

```bash
# Cache configuration
CACHE_ENABLED=true
CACHE_TTL=300        # 5 minutes default
CACHE_MAX_SIZE=1000  # Max cache entries
```

### Rate Limiting

```bash
# General API limits
RATE_LIMIT_REQUESTS=100    # Per 15 minutes
EXPENSIVE_RATE_LIMIT=20    # Claude API calls per hour

# GitHub Actions limits (more generous)
GHA_RATE_LIMIT=200         # Per hour per repository
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start in watch mode
npm run dev

# Run tests
npm test

# Type checking (if using TypeScript)
npm run typecheck
```

### Project Structure

```
claude-proxy/
├── src/
│   ├── server.js           # Main server
│   ├── bridge.js           # Claude API bridge
│   ├── middleware/         # Express middleware
│   └── utils/              # Utilities
├── config/                 # Configuration files
├── scripts/               # Setup and maintenance scripts
├── docker/                # Docker configurations
└── logs/                  # Log files
```

### Environment Variables

See `.env.example` for complete configuration options.

## 🚨 Troubleshooting

### Common Issues

**1. Proxy won't start**
```bash
# Check port availability
netstat -tulpn | grep :3000

# Check logs
tail -f logs/error.log
```

**2. Authentication failures**
```bash
# Verify API key
curl -H "X-Api-Key: your-key" http://localhost:3000/api/status

# Check environment
echo $AUTHORIZED_API_KEYS
```

**3. Claude API errors**
```bash
# Test Claude connectivity
curl -H "X-Api-Key: your-key" http://localhost:3000/api/status

# Check logs for API errors
grep "Claude API" logs/combined.log
```

**4. GitHub Actions integration**
```bash
# Verify proxy in Actions
- run: curl http://localhost:3000/health

# Check workflow logs for proxy startup
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Verbose output
DEBUG=* npm start
```

## 📚 Examples

### Basic Chat

```javascript
const response = await fetch('http://localhost:3000/api/claude/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'your-api-key'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Hello Claude!' }
    ]
  })
});
```

### GitHub Actions Format

```javascript
const response = await fetch('http://localhost:3000/api/github-actions/claude', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-GitHub-Repository': 'owner/repo'
  },
  body: JSON.stringify({
    action: 'chat',
    direct_prompt: 'Review this code...',
    context: { pr_number: 123 }
  })
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related

- [Anthropic Claude API](https://docs.anthropic.com/)
- [Claude Code SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Built for the Claude Squad Orchestration project** 🤖