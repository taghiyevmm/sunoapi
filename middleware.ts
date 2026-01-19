import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only protect /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow callback routes (Suno calls these)
  if (pathname.includes('/callback')) {
    return NextResponse.next();
  }

  // Get the API key from header
  const clientApiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.CLIENT_API_KEY;

  // If no CLIENT_API_KEY is set, allow all requests (dev mode)
  if (!validApiKey) {
    return NextResponse.next();
  }

  // Validate API key
  if (clientApiKey !== validApiKey) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
