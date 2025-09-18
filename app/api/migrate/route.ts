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
    
    // Run migrations
    console.log('Running migrations from drizzle folder...')
    await migrate(db, { migrationsFolder: './drizzle' })
    
    console.log('Migration completed successfully')
    await sql.end()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database migration completed successfully'
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.stack 
      },
      { status: 500 }
    )
  }
}