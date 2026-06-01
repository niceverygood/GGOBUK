import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, supabaseUrl, supabasePublicKey } from './env';

export async function updateSession(request: NextRequest) {
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
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path === '/llms.txt' ||
    path === '/privacy' ||
    path === '/terms' ||
    path === '/saju' ||
    path === '/gunghap' ||
    path === '/today-fortune' ||
    path === '/daewoon' ||
    path === '/taegil' ||
    // 60갑자 일주 사전 + 공유형 캐릭터 카드 — 검색 유입·바이럴 진입점이므로
    // 로그인 없이도 200 으로 열려야 한다(공유 링크를 받은 비로그인 친구 포함).
    path === '/ilju' ||
    path.startsWith('/ilju/') ||
    path.startsWith('/preview') ||
    path.startsWith('/invite') ||
    path.startsWith('/api/preview') ||
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path.startsWith('/characters') ||
    path.startsWith('/manifest.json') ||
    // Digital Asset Links / Apple App Site Association etc. MUST be served as a
    // plain 200 to unauthenticated crawlers (Google TWA verifier, Apple). Never
    // redirect these to /login or the TWA address bar won't verify.
    path.startsWith('/.well-known/');

  let response = NextResponse.next({ request });

  if (isPublic || path.startsWith('/api/')) return response;

  // If Supabase isn't configured (local dev without keys), let the request through.
  // Pages and routes that actually need auth will fail individually with clearer messages.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl(), supabasePublicKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
