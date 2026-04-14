import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Placeholder: Clerk middleware added in Story 1.3
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
