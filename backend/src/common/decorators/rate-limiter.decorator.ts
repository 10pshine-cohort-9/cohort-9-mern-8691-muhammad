import { Throttle } from '@nestjs/throttler';

/**
 * Rate limiter Decorator for Sensitive Endpoints with Max 5 requests per minute
 */
export const StrictRateLimit = () =>
  Throttle({ default: { limit: 5, ttl: 60000 } });

/**
 * Rate limiter Decorator for Login Endpoint with Max 10 requests per minute
 */
export const LoginRateLimit = () =>
  Throttle({ default: { limit: 10, ttl: 60000 } });
