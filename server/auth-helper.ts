import type { IncomingMessage } from 'http'
import { decode } from 'next-auth/jwt'

// NextAuth v5 supports both AUTH_SECRET and NEXTAUTH_SECRET
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

interface SessionUser {
  id: string
  username: string
  email?: string
}

/**
 * Extract user session from NextAuth JWT cookie in WebSocket upgrade request
 */
export async function getUserFromRequest(
  request: IncomingMessage
): Promise<SessionUser | null> {
  try {
    // Parse cookies from request headers
    const cookieHeader = request.headers.cookie
    if (!cookieHeader) {
      console.log('🔒 No cookie header in WebSocket request')
      return null
    }

    // NextAuth v5 uses authjs cookie names:
    // In production with HTTPS: __Secure-authjs.session-token or __Host-authjs.session-token
    // In development with HTTP: authjs.session-token
    // Legacy v4 names: __Secure-next-auth.session-token or next-auth.session-token
    const cookies = parseCookies(cookieHeader)
    console.log('🔒 Available cookies:', Object.keys(cookies))
    const token =
      cookies['__Secure-authjs.session-token'] ||
      cookies['__Host-authjs.session-token'] ||
      cookies['authjs.session-token'] ||
      cookies['__Secure-next-auth.session-token'] ||
      cookies['next-auth.session-token']

    if (!token) {
      console.log('🔒 No NextAuth session token found')
      return null
    }

    console.log('🔒 Found NextAuth token, decoding...')

    // Decode the JWT token
    if (!AUTH_SECRET) {
      console.error('🔒 ERROR: No AUTH_SECRET or NEXTAUTH_SECRET environment variable set!')
      return null
    }

    const decoded = await decode({
      token,
      secret: AUTH_SECRET,
      salt: '',
    })

    if (!decoded || !decoded.id) {
      console.log('🔒 Token decode failed or missing id')
      return null
    }

    return {
      id: decoded.id as string,
      username: (decoded.username as string) || '',
      email: decoded.email as string | undefined,
    }
  } catch (error) {
    console.error('Error extracting user from request:', error)
    return null
  }
}

/**
 * Parse cookie string into key-value pairs
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce(
    (cookies, cookie) => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = decodeURIComponent(value)
      }
      return cookies
    },
    {} as Record<string, string>
  )
}
