import { NextResponse } from 'next/server'
import { pg } from '@/lib/db/connection'

// Force Node.js runtime for database operations
export const runtime = 'nodejs'

export async function GET() {
  try {
    const r = await pg.query('select now() as now')
    return NextResponse.json({ 
      ok: true, 
      now: r.rows[0].now,
      connectionInfo: {
        totalConnections: pg.totalCount,
        idleConnections: pg.idleCount,
        waitingConnections: pg.waitingCount
      }
    })
  } catch (e: any) {
    console.error('DB health failed:', e)
    return NextResponse.json(
      { 
        ok: false, 
        code: e?.code, 
        errno: e?.errno, 
        message: e?.message 
      },
      { status: 500 }
    )
  }
}