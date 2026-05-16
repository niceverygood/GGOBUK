import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, supabaseUrl, supabasePublicKey } from './env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If Supabase isn't configured (local dev without keys), let the request through.
  // Pages and routes that actually need auth will fail individually with clearer messages.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl(), supabasePublicKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;
  const isAuthRoute =
    path.startsWith('/login') ||
    path.startsWith('/splash') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/callback');
  const isPublic =
    path === '/' ||
    isAuthRoute ||
    path.startsWith('/preview') ||
    path.startsWith('/api/preview') ||
    path.startsWith('/sprite-test') ||
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path.startsWith('/characters') ||
    path.startsWith('/manifest.json');

  if (!user && !isPublic) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
