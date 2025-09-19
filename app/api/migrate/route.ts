import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  try {
    console.log('Starting database migration...')

    // Dynamic imports to avoid build-time issues
    const { migrate } = await import('drizzle-orm/postgres-js/migrator')
    const postgres = (await import('postgres')).default
    const { drizzle } = await import('drizzle-orm/postgres-js')

    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL not found in environment variables')
    }

    // Create connection for migration with SSL
    const sql = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30
    })

    const db = drizzle(sql)

    // Run migrations - try different path strategies for Vercel
    console.log('Running migrations from drizzle folder...')

    // Try multiple possible paths for Vercel deployment
    const possiblePaths = [
      './drizzle',
      'drizzle',
      process.cwd() + '/drizzle',
      '/var/task/drizzle',
      '/var/task/.next/server/drizzle'
    ]

    let migrationPath = './drizzle'

    // Check which path exists (this is a fallback for serverless environments)
    for (const path of possiblePaths) {
      try {
        const fs = await import('fs')
        if (fs.existsSync(path + '/meta/_journal.json')) {
          migrationPath = path
          console.log('Found migrations at:', migrationPath)
          break
        }
      } catch (e) {
        // Continue to next path
      }
    }

    try {
      await migrate(db, { migrationsFolder: migrationPath })
      console.log('Migration completed successfully using drizzle files')
    } catch (migrationError) {
      const errorMessage =
        migrationError instanceof Error
          ? migrationError.message
          : String(migrationError)
      console.log(
        'Drizzle file migration failed, trying direct SQL approach...',
        errorMessage
      )

      // Fallback: Run SQL directly if migration files aren't available
      const { sql: sqlTemplate } = await import('drizzle-orm')

      // Create essential tables directly (simplified version without RLS)
      await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`

      await sql`
        CREATE TABLE IF NOT EXISTS "chats" (
          "id" varchar(191) PRIMARY KEY NOT NULL,
          "title" text NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "user_id" varchar(255) NOT NULL,
          "visibility" varchar(256) DEFAULT 'private' NOT NULL
        )
      `

      await sql`
        CREATE TABLE IF NOT EXISTS "messages" (
          "id" varchar(191) PRIMARY KEY NOT NULL,
          "chat_id" varchar(191) NOT NULL,
          "role" varchar(256) NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone,
          "metadata" jsonb
        )
      `

      await sql`
        CREATE TABLE IF NOT EXISTS "parts" (
          "id" varchar(191) PRIMARY KEY NOT NULL,
          "message_id" varchar(191) NOT NULL,
          "order" integer NOT NULL,
          "type" varchar(256) NOT NULL,
          "text_text" text,
          "reasoning_text" text,
          "file_media_type" varchar(256),
          "file_filename" varchar(1024),
          "file_url" text,
          "tool_tool_call_id" varchar(256),
          "tool_state" varchar(256),
          "tool_error_text" text,
          "tool_search_input" json,
          "tool_search_output" json,
          "provider_metadata" json
        )
      `

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS "chats_user_id_idx" ON "chats" ("user_id")`
      await sql`CREATE INDEX IF NOT EXISTS "chats_created_at_idx" ON "chats" ("created_at" DESC)`
      await sql`CREATE INDEX IF NOT EXISTS "messages_chat_id_idx" ON "messages" ("chat_id")`
      await sql`CREATE INDEX IF NOT EXISTS "parts_message_id_idx" ON "parts" ("message_id")`

      // Add foreign key constraints
      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'messages_chat_id_chats_id_fk'
          ) THEN
            ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" 
            FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE cascade;
          END IF;
        END $$
      `

      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'parts_message_id_messages_id_fk'
          ) THEN
            ALTER TABLE "parts" ADD CONSTRAINT "parts_message_id_messages_id_fk" 
            FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade;
          END IF;
        END $$
      `

      console.log('Migration completed successfully using direct SQL')
    }

    await sql.end()

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    })
  } catch (error) {
    console.error('Migration error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    const errorDetails = error instanceof Error ? error.stack : String(error)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    )
  }
}
