import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL
const adapter = databaseUrl ? new PrismaPg(new Pool({ connectionString: databaseUrl })) : undefined

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(adapter ? { adapter } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
