import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as relations from './relations'
import * as schema from './schema'

// For server-side usage only
// Use restricted user for application if available, otherwise fall back to regular user
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

// Lazy database connection - only initialize when actually used
let _db: ReturnType<typeof drizzle> | null = null

function initializeDatabase() {
  if (_db) return _db

  // Return mock database during build phase to prevent errors
  if (isBuild) {
    // Return a comprehensive mock that satisfies TypeScript but doesn't actually connect
    _db = {
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
      insert: () => ({ values: () => Promise.resolve({ changes: 0 }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve({ changes: 0 }) }) }),
      delete: () => ({ where: () => Promise.resolve({ changes: 0 }) }),
      execute: () => Promise.resolve([]),
      transaction: (callback: any) => callback(_db),
      $with: () => _db,
      query: {
        messages: {
          findMany: () => Promise.resolve([]),
          findFirst: () => Promise.resolve(null)
        },
        chats: {
          findMany: () => Promise.resolve([]),
          findFirst: () => Promise.resolve(null)
        }
      }
    } as any
    return _db
  }

  if (
    !process.env.DATABASE_URL &&
    !process.env.DATABASE_RESTRICTED_URL &&
    !isTest
  ) {
    throw new Error(
      'DATABASE_URL or DATABASE_RESTRICTED_URL environment variable is not set'
    )
  }

  // Connection with connection pooling for server environments
  // Prefer restricted user for application runtime
  const connectionString =
    process.env.DATABASE_RESTRICTED_URL ?? // Prefer restricted user
    process.env.DATABASE_URL ??
    (isTest ? 'postgres://user:pass@localhost:5432/testdb' : undefined)

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL or DATABASE_RESTRICTED_URL environment variable is not set'
    )
  }

  // Log which connection is being used (for debugging)
  if (isDevelopment) {
    console.log(
      '[DB] Using connection:',
      process.env.DATABASE_RESTRICTED_URL
        ? 'Restricted User (RLS Active)'
        : 'Owner User (RLS Bypassed)'
    )
  }

  const client = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    prepare: false,
    max: 5, // Reduced max connections for better pooling on Vercel
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10 // Connection timeout in seconds
  })

  _db = drizzle(client, {
    schema: { ...schema, ...relations }
  })

  return _db
}

// Export a getter function that lazily initializes the database
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    const database = initializeDatabase()
    if (!database) {
      throw new Error('Database not initialized')
    }
    return database[prop as keyof ReturnType<typeof drizzle>]
  }
})

// Helper type for all tables
export type Schema = typeof schema

// Verify restricted user permissions on startup
if (process.env.DATABASE_RESTRICTED_URL && !isTest && !isBuild) {
  // Only run verification in server environments, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    ;(async () => {
      try {
        const result = await db.execute<{ current_user: string }>(
          sql`SELECT current_user`
        )
        const currentUser = result[0]?.current_user

        if (isDevelopment) {
          console.log('[DB] ✓ Connection verified as user:', currentUser)
        }

        // Verify it's the restricted user (app_user)
        if (
          currentUser &&
          !currentUser.includes('app_user') &&
          !currentUser.includes('neondb_owner')
        ) {
          console.warn(
            '[DB] ⚠️ Warning: Expected app_user but connected as:',
            currentUser
          )
        }
      } catch (error) {
        console.error('[DB] ✗ Failed to verify database connection:', error)
        // Log the error but don't terminate the application
        // This allows development to continue even with connection issues
      }
    })()
  }
}
