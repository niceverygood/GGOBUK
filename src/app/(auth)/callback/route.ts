import { NextResponse, after } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth/safe-next';
import { grantSignupBonusIfNeeded } from '@/lib/credits/server';
import { logger } from '@/lib/utils/logger';
import { recordEvent, readTrackingContext } from '@/lib/analytics/events';
import { sendFbCapiEvent, parseFbCookies } from '@/lib/analytics/fb';
import { isKakaoUser } from '@/lib/auth/provider';


function loginRedirect(request: Request, error: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const oauthError = url.searchParams.get('error');
  if (oauthError) return loginRedirect(request, 'kakao_oauth_failed');

  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  if (!code) return loginRedirect(request, 'missing_oauth_code');

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return loginRedirect(request, 'kakao_callback_failed');

  // Ensure a row exists in public.users.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return loginRedirect(request, 'kakao_callback_failed');
  if (!isKakaoUser(user)) {
    await supabase.auth.signOut({ scope: 'local' });
    return loginRedirect(request, 'kakao_required');
  }

  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    nickname?: string;
    preferred_username?: string;
  };
  const nickname = meta.nickname ?? meta.name ?? meta.full_name ?? meta.preferred_username ?? null;
  const provider = 'kakao';
  const kakaoId = user.app_metadata?.provider_id
    ? String(user.app_metadata.provider_id)
    : null;

  // 신규 가입 판별 — public.users 행이 아직 없으면 이번이 첫 인증(=가입)이다.
  // 반환 로그인(returning)에서는 signup 이벤트·CAPI 가중·어트리뷰션을 건드리지 않는다.
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, attr_first_seen_at')
    .eq('id', user.id)
    .maybeSingle();
  const isNewUser = !existingUser;

  // first-touch 어트리뷰션 — 광고 클릭 시 미들웨어가 굳혀둔 쿠키에서 복사한다.
  // 신규 가입자에 한해 한 번만 기록(첫 터치 우선).
  const { attribution } = await readTrackingContext();
  const upsertPayload: Record<string, unknown> = {
    id: user.id,
    nickname,
    kakao_id: kakaoId,
  };
  if (isNewUser && attribution) {
    upsertPayload.attr_source = attribution.source ?? null;
    upsertPayload.attr_medium = attribution.medium ?? null;
    upsertPayload.attr_campaign = attribution.campaign ?? null;
    upsertPayload.attr_content = attribution.content ?? null;
    upsertPayload.attr_term = attribution.term ?? null;
    upsertPayload.attr_fbclid = attribution.fbclid ?? null;
    upsertPayload.attr_landing_path = attribution.landing ?? null;
    upsertPayload.attr_referrer = attribution.referrer ?? null;
    upsertPayload.attr_first_seen_at = attribution.ts ?? new Date().toISOString();
  }
  // ⚠️ admin client 로 쓴다. migration 19 가 authenticated 의 users INSERT/UPDATE 를
  //    컬럼 단위로 축소했기 때문에(권한상승 차단) 사용자 클라이언트로는 kakao_id·attr_* 를
  //    쓸 수 없다. 이 라우트는 이미 서버 전용이라 admin 사용이 안전하다.
  const adminForUpsert = await createServerClient({ admin: true });
  await adminForUpsert.from('users').upsert(upsertPayload, { onConflict: 'id' });

  // Grant 30-credit signup bonus (idempotent — RPC only credits once).
  try {
    await grantSignupBonusIfNeeded(user.id);
  } catch (e) {
    logger.warn('callback', 'signup bonus failed', { error: e instanceof Error ? e.message : String(e) });
  }

  // 가입 전환 신호 — 신규 가입자만. 응답 지연이 없도록 after() 로 미룬다.
  if (isNewUser) {
    const cookieHeader = request.headers.get('cookie');
    const userAgent = request.headers.get('user-agent');
    const ip =
      (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;
    const email = user.email;
    after(async () => {
      await recordEvent({
        event: 'signup',
        userId: user.id,
        attribution,
        props: { provider },
      });
      await sendFbCapiEvent({
        eventName: 'CompleteRegistration',
        eventId: `reg_${user.id}`,
        eventSourceUrl: request.url,
        user: {
          email,
          externalId: user.id,
          fbclid: attribution?.fbclid,
          clientUserAgent: userAgent,
          clientIpAddress: ip,
          ...parseFbCookies(cookieHeader),
        },
      });
    });
  }

  let destination = next;
  if (next === '/home') {
    const { data: profile } = await supabase
      .from('saju_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();
    if (!profile) destination = '/onboarding/saju';
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
