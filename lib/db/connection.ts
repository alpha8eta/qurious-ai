import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const globalForDb = globalThis as unknown as { pool?: Pool }

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL!, // pooled 6543 URL
    ssl: { rejectUnauthorized: false }, // Explicit SSL for Supabase
    max: 2, // Lower for serverless environments
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
    allowExitOnIdle: true
  })

if (!globalForDb.pool) globalForDb.pool = pool

export const db = drizzle(pool)
