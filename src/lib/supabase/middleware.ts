import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, supabaseUrl, supabasePublicKey } from './env';
import {
  ANON_COOKIE,
  ATTR_COOKIE,
  ANON_MAX_AGE_SEC,
  ATTR_MAX_AGE_SEC,
  newAnonId,
  parseAttributionFromQuery,
  serializeAttribution,
} from '@/lib/analytics/attribution';
import { isKakaoUser } from '@/lib/auth/provider';

interface CookieToSet {
  name: string;
  value: string;
  options: {
    maxAge: number;
    path: string;
    sameSite: 'lax';
    httpOnly: boolean;
    secure: boolean;
  };
}

/**
 * 광고 유입 어트리뷰션을 "문 앞에서" 굳힌다. 모든 요청(공개 랜딩·/api 포함)에서
 * 인증 분기 이전에 실행해 페이스북 광고 트래픽(utm_* · fbclid)을 놓치지 않는다.
 *  · kj_anon — 익명 방문자 식별자(없으면 발급). page_view 이벤트 stitch 용.
 *  · kj_attr — first-touch 어트리뷰션(이미 있으면 덮지 않음 = 첫 터치 우선).
 */
function collectAttributionCookies(request: NextRequest): CookieToSet[] {
  const out: CookieToSet[] = [];
  const secure = process.env.NODE_ENV === 'production';
  const base = { path: '/', sameSite: 'lax' as const, httpOnly: true, secure };

  if (!request.cookies.get(ANON_COOKIE)) {
    out.push({
      name: ANON_COOKIE,
      value: newAnonId(),
      options: { ...base, maxAge: ANON_MAX_AGE_SEC },
    });
  }

  if (!request.cookies.get(ATTR_COOKIE)) {
    const attr = parseAttributionFromQuery(
      request.nextUrl.searchParams,
      request.nextUrl.pathname,
      request.headers.get('referer') ?? undefined,
    );
    if (attr) {
      out.push({
        name: ATTR_COOKIE,
        value: serializeAttribution(attr),
        options: { ...base, maxAge: ATTR_MAX_AGE_SEC },
      });
    }
  }

  return out;
}

function applyCookies(response: NextResponse, cookies: CookieToSet[]) {
  for (const c of cookies) response.cookies.set(c.name, c.value, c.options);
}

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;
  const attrCookies = collectAttributionCookies(request);
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
    path === '/today-fortune' ||
    // 60갑자 일주 사전 + 공유형 캐릭터 카드 — 검색 유입·바이럴 진입점이므로
    // 로그인 없이도 200 으로 열려야 한다(공유 링크를 받은 비로그인 친구 포함).
    path === '/ilju' ||
    path.startsWith('/ilju/') ||
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path.startsWith('/characters') ||
    path.startsWith('/manifest.json') ||
    // Digital Asset Links / Apple App Site Association etc. MUST be served as a
    // plain 200 to unauthenticated crawlers (Google TWA verifier, Apple). Never
    // redirect these to /login or the TWA address bar won't verify.
    path.startsWith('/.well-known/');
  const isPublicApi =
    path.startsWith('/api/og/') ||
    path === '/api/track' ||
    path === '/api/payment/kakao/webhook' ||
    // Vercel Cron 은 세션 쿠키 없이 호출한다. 미들웨어에서 막으면 라우트 핸들러의
    // CRON_SECRET 검증에 도달조차 못 한다(일일 운세 벌크 생성·푸시가 통째로 죽음).
    // 핸들러가 GET(세션 필수)·POST(CRON_SECRET 필수) 양쪽을 자체 인증하므로 통과시켜도 안전하다.
    path === '/api/daily';

  let response = NextResponse.next({ request });

  if (isPublic || isPublicApi) {
    applyCookies(response, attrCookies);
    return response;
  }

  // If Supabase isn't configured (local dev without keys), let the request through.
  // Pages and routes that actually need auth will fail individually with clearer messages.
  if (!isSupabaseConfigured()) {
    applyCookies(response, attrCookies);
    return response;
  }

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
    data: { user },
  } = await supabase.auth.getUser();

  if (!isKakaoUser(user)) {
    if (path.startsWith('/api/')) {
      const unauthorized = NextResponse.json(
        { error: user ? 'kakao_login_required' : 'unauthorized' },
        { status: 401 },
      );
      applyCookies(unauthorized, attrCookies);
      return unauthorized;
    }

    url.pathname = '/login';
    if (user) url.searchParams.set('error', 'kakao_required');
    const redirect = NextResponse.redirect(url);
    applyCookies(redirect, attrCookies);
    return redirect;
  }

  applyCookies(response, attrCookies);
  return response;
}
