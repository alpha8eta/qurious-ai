// Optimized database connection for Vercel/Supabase production usage
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as relations from './relations'
import * as schema from './schema'

// Global singleton pool to prevent connection exhaustion
const g = globalThis as any

export const pg: Pool =
  g.__pg ??
  new Pool({
    connectionString: process.env.DATABASE_URL, // 6543 + sslmode=require
    max: 5, // keep well under Supabase pool size (15)
    idleTimeoutMillis: 10_000, // free idle connections quickly
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true
    // ssl is inferred from ?sslmode=require; no extra CA needed
  })

if (!g.__pg) g.__pg = pg

// Create drizzle instance with proper schema
export const db = drizzle(pg, {
  schema: { ...schema, ...relations }
})

// Helper type for all tables
export type Schema = typeof schema
