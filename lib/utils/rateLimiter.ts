/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if a request should be allowed
   * @param identifier Unique identifier (e.g., IP address or user ID)
   * @param config Rate limit configuration
   * @returns Object with allowed status and retry information
   */
  checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    // No previous requests or window expired
    if (!entry || now > entry.resetTime) {
      const resetTime = now + config.windowMs;
      this.requests.set(identifier, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    // Within the window, check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Reset limits for a specific identifier
   */
  reset(identifier: string) {
    this.requests.delete(identifier);
  }

  /**
   * Get current stats for an identifier
   */
  getStats(identifier: string): {
    count: number;
    resetTime: number;
  } | null {
    return this.requests.get(identifier) || null;
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  register: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  login: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  general: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default (localhost)
  return '127.0.0.1';
}
