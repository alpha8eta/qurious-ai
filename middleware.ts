// Static import removed - was blocking first request. Use dynamic import if needed.
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simplified middleware for development performance  
  return NextResponse.next()
  
  // Get the protocol from X-Forwarded-Proto header or request protocol
  const protocol =
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol

  // Get the host from X-Forwarded-Host header or request host
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || ''

  // Construct the base URL - ensure protocol has :// format
  const baseUrl = `${protocol}${protocol.endsWith(':') ? '//' : '://'}${host}`

  // Create a response
  let response: NextResponse

  // Temporarily disable Supabase middleware for debugging
  response = NextResponse.next()

  // Add request information to response headers
  response.headers.set('x-url', request.url)
  response.headers.set('x-host', host)
  response.headers.set('x-protocol', protocol)
  response.headers.set('x-base-url', baseUrl)

  return response
}

export const config = {
  matcher: [
    // Match all routes except Next.js internal routes and static files
    '/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
