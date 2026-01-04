import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiter, RATE_LIMITS, getClientIp } from '@/lib/utils/rateLimiter';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting to auth endpoints
  if (pathname.startsWith('/api/auth/') && request.method === 'POST') {
    const clientIp = getClientIp(request);

    // Use login rate limit for NextAuth endpoints
    if (pathname.includes('/api/auth/callback') || pathname.includes('/api/auth/signin')) {
      const rateLimitResult = rateLimiter.checkLimit(clientIp, RATE_LIMITS.login);

      if (!rateLimitResult.allowed) {
        const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': RATE_LIMITS.login.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            },
          }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/:path*'],
};
