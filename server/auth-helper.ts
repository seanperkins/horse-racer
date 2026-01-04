import type { IncomingMessage } from 'http'
import { decode } from 'next-auth/jwt'
import { z } from 'zod'

// NextAuth v5 supports both AUTH_SECRET and NEXTAUTH_SECRET
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

// Environment-based cookie configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const COOKIE_NAME = IS_PRODUCTION
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token'

// Zod schema for validating decoded JWT payload
const SessionPayloadSchema = z.object({
  id: z.string().min(1),
  username: z.string().default(''),
  email: z.string().email().optional(),
})

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
    const cookieHeader = request.headers.cookie
    if (!cookieHeader) {
      console.log('🔒 No cookie header in WebSocket request')
      return null
    }

    const cookies = parseCookies(cookieHeader)
    const token = cookies[COOKIE_NAME]

    if (!token) {
      console.log(`🔒 No session token found (expected: ${COOKIE_NAME})`)
      return null
    }

    if (!AUTH_SECRET) {
      console.error('🔒 ERROR: No AUTH_SECRET or NEXTAUTH_SECRET environment variable set!')
      return null
    }

    const decoded = await decode({
      token,
      secret: AUTH_SECRET,
      salt: COOKIE_NAME,
    })

    if (!decoded) {
      console.log('🔒 Token decode returned null')
      return null
    }

    // Validate the decoded payload structure
    const result = SessionPayloadSchema.safeParse(decoded)
    if (!result.success) {
      console.log('🔒 Token payload validation failed:', result.error.message)
      return null
    }

    console.log(`🔒 Successfully authenticated user: ${result.data.id}`)

    return result.data
  } catch (error) {
    console.error('🔒 Error extracting user from request:', error instanceof Error ? error.message : 'Unknown error')
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
