import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import 'dotenv/config'

// This script is used to run migrations on the database
// Run it with: bun run lib/db/migrate.ts

const runMigrations = async () => {
  // Prevent migrations from running during Vercel builds
  if (process.env.VERCEL) {
    console.log('Skipping migrations on Vercel build environment')
    process.exit(0)
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined in environment variables')
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL
  
  // For Supabase connections, use SSL require mode for direct connections (port 5432)
  // Disable prepared statements for transaction pooling compatibility
  const sql = postgres(connectionString, {
    ssl: 'require', // Use SSL require for direct Supabase connections
    prepare: false,
    connect_timeout: 30, // 30 second connection timeout for migrations
    idle_timeout: 0, // No idle timeout for migrations
    max: 1 // Single connection for migrations
  })

  const db = drizzle(sql)

  console.log('Running migrations...')

  try {
    await migrate(db, { migrationsFolder: 'drizzle' })
    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  await sql.end()
  process.exit(0)
}

runMigrations()
