import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../cache/redis.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate_limit:${ip}:${req.route?.path || req.path}`;
    
    const limit = 100;
    const windowSeconds = 60;

    try {
      const current = await this.redis.get(key);
      
      if (current && parseInt(current) >= limit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            retryAfter: await this.redis.ttl(key),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
      
      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      next();
    }
  }
}
