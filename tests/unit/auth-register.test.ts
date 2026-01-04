import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}))

describe('Registration API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
      }

      // Mock no existing user
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

      // Mock password hash
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as any)

      // Mock user creation (returns only selected fields, no passwordHash)
      const completeUser = {
        ...mockUser,
        passwordHash: 'hashed_password',
        updatedAt: new Date(),
        xp: 0,
        level: 1,
        totalMatches: 0,
        totalWins: 0,
      }
      vi.mocked(prisma.user.create).mockResolvedValue(completeUser)

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.id).toBe(mockUser.id)
      expect(data.user.email).toBe(mockUser.email)
      expect(data.user.username).toBe(mockUser.username)
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashed_password',
        },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
        },
      })
    })

    it('should reject duplicate email', async () => {
      // Mock existing user with same email
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
        username: 'otheruser',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        xp: 0,
        level: 1,
        totalMatches: 0,
        totalWins: 0,
      })

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'newuser',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already in use')
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it('should reject duplicate username', async () => {
      // Mock existing user with same username
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'existing-user',
        email: 'other@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        xp: 0,
        level: 1,
        totalMatches: 0,
        totalWins: 0,
      })

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Username already taken')
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it('should validate email format', async () => {
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not an email at all',
          username: 'testuser',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(Array.isArray(data.error)).toBe(true) // Zod returns array of errors
      expect(prisma.user.findFirst).not.toHaveBeenCalled()
    })

    it('should validate username length (min 3 characters)', async () => {
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'ab',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(Array.isArray(data.error)).toBe(true) // Zod returns array of errors
      expect(prisma.user.findFirst).not.toHaveBeenCalled()
    })

    it('should validate username length (max 20 characters)', async () => {
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'thisusernameiswaytoolong',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(Array.isArray(data.error)).toBe(true) // Zod returns array of errors
      expect(prisma.user.findFirst).not.toHaveBeenCalled()
    })

    it('should validate password length (min 6 characters)', async () => {
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: '12345',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(Array.isArray(data.error)).toBe(true) // Zod returns array of errors
      expect(prisma.user.findFirst).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.user.findFirst).mockRejectedValue(new Error('Database connection failed'))

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should hash password with bcrypt using 10 rounds', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as any)
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        xp: 0,
        level: 1,
        totalMatches: 0,
        totalWins: 0,
      })

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'mySecretPassword',
        }),
      })

      await POST(request)

      expect(bcrypt.hash).toHaveBeenCalledWith('mySecretPassword', 10)
    })

    it('should not return password hash in response', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as any)
      // Mock should return only selected fields (matching the actual select in route)
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
      } as any)

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.user).toBeDefined()
      expect(data.user.passwordHash).toBeUndefined()
      expect(data.user.password).toBeUndefined()
    })
  })
})
