import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, static files, and .well-known (asset links / AASA
    // must reach the static handler as a 200, never the auth redirect).
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
