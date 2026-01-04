import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

// Create Prisma client with pg adapter (same as lib/prisma.ts)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const testEmail = 'test@example.com'
  const testPassword = 'TestPassword123!'
  const testUsername = 'TestPlayer'

  // Check if test user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  })

  if (existingUser) {
    console.log('Test user already exists:', testEmail)
    return
  }

  // Hash password
  const passwordHash = await bcrypt.hash(testPassword, 10)

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      username: testUsername,
      passwordHash,
    },
  })

  console.log('Created test user:', {
    id: user.id,
    email: user.email,
    username: user.username,
  })
}

main()
  .catch((e) => {
    console.error('Error seeding test user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
    await prisma.$disconnect()
  })
