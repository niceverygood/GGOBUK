import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/api/auth') || path.startsWith('/callback');
  const isPublic = path === '/' || isAuthRoute || path.startsWith('/_next') || path.startsWith('/icons') || path.startsWith('/manifest.json');

  if (!user && !isPublic) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
