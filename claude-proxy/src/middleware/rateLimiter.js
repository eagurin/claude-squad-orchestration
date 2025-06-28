import { RateLimiterMemory } from 'rate-limiter-flexible';

export class RateLimiter {
  constructor() {
    // Rate limiter for general API requests
    this.generalLimiter = new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: parseInt(process.env.RATE_LIMIT_REQUESTS) || 100, // Number of requests
      duration: parseInt(process.env.RATE_LIMIT_WINDOW) || 900, // Per 15 minutes
    });

    // Stricter rate limiter for expensive operations
    this.expensiveLimiter = new RateLimiterMemory({
      keyGenerator: (req) => req.ip,
      points: parseInt(process.env.EXPENSIVE_RATE_LIMIT) || 20, // Number of requests
      duration: parseInt(process.env.EXPENSIVE_RATE_WINDOW) || 3600, // Per hour
    });

    // GitHub Actions specific limiter (more generous)
    this.githubActionsLimiter = new RateLimiterMemory({
      keyGenerator: (req) => req.headers['x-github-repository'] || req.ip,
      points: parseInt(process.env.GHA_RATE_LIMIT) || 200,
      duration: parseInt(process.env.GHA_RATE_WINDOW) || 3600, // Per hour
    });
  }

  get middleware() {
    return async (req, res, next) => {
      try {
        // Determine which limiter to use
        let limiter = this.generalLimiter;
        
        if (req.path.includes('/github-actions/')) {
          limiter = this.githubActionsLimiter;
        } else if (req.path.includes('/claude/messages')) {
          limiter = this.expensiveLimiter;
        }

        // Apply rate limiting
        const resRateLimiter = await limiter.consume(req.ip);
        
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': limiter.points,
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints,
          'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString(),
        });

        next();
      } catch (rejRes) {
        // Rate limit exceeded
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: secs,
          limit: rejRes.totalHits,
          remaining: rejRes.remainingPoints,
        });
      }
    };
  }
}