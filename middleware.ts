// Static import removed - was blocking first request. Use dynamic import if needed.
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simplified middleware for development and deployment performance
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except Next.js internal routes and static files
    '/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
