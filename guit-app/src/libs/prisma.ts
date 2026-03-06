import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Prisma 7: Use adapter with URL (per official docs)
const isTest = process.env.NODE_ENV === 'test'
const defaultUrl = isTest ? 'file:./prisma/test.db' : 'file:./prisma/dev.db'
const databaseUrl = (isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL) || defaultUrl

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl
})

export const prisma = new PrismaClient({ adapter })
