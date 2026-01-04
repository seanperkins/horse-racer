import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
    await prisma.$disconnect()
  })
