import crypto from 'crypto';

export class AuthMiddleware {
  constructor() {
    this.apiKeys = new Set(
      (process.env.AUTHORIZED_API_KEYS || '').split(',').filter(key => key.trim())
    );
    this.githubTokens = new Set(
      (process.env.GITHUB_TOKENS || '').split(',').filter(token => token.trim())
    );
    this.requireAuth = process.env.REQUIRE_AUTH !== 'false';
  }

  get middleware() {
    return (req, res, next) => {
      // Skip auth for health check
      if (req.path === '/health') {
        return next();
      }

      // Skip auth if not required (development mode)
      if (!this.requireAuth) {
        return next();
      }

      const authHeader = req.headers.authorization;
      const apiKey = req.headers['x-api-key'];
      const githubToken = req.headers['x-github-token'];

      // Check API key
      if (apiKey && this.apiKeys.has(apiKey)) {
        req.authType = 'api-key';
        return next();
      }

      // Check Bearer token
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (this.apiKeys.has(token)) {
          req.authType = 'bearer';
          return next();
        }
      }

      // Check GitHub token for GitHub Actions endpoints
      if (req.path.includes('/github-actions/') && githubToken) {
        if (this.githubTokens.has(githubToken) || this.isValidGitHubToken(req)) {
          req.authType = 'github';
          return next();
        }
      }

      // Check for local development
      if (this.isLocalRequest(req)) {
        req.authType = 'local';
        return next();
      }

      // Unauthorized
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid API key, Bearer token, or GitHub token required',
        authMethods: ['x-api-key', 'Authorization: Bearer <token>', 'x-github-token'],
      });
    };
  }

  isValidGitHubToken(req) {
    // Validate GitHub Actions context
    const requiredHeaders = [
      'x-github-repository',
      'x-github-workflow',
      'x-github-actor',
    ];

    return requiredHeaders.every(header => req.headers[header]);
  }

  isLocalRequest(req) {
    const ip = req.ip || req.connection.remoteAddress;
    const localIPs = ['::1', '::ffff:127.0.0.1', '127.0.0.1', 'localhost'];
    
    return localIPs.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.');
  }

  // Generate API key utility
  static generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}