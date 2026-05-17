import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function safeNext(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/home';
  return path;
}

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

  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    nickname?: string;
    preferred_username?: string;
  };
  const nickname = meta.nickname ?? meta.name ?? meta.full_name ?? meta.preferred_username ?? null;
  const kakaoId = user.app_metadata?.provider_id ? String(user.app_metadata.provider_id) : null;
  await supabase
    .from('users')
    .upsert({ id: user.id, nickname, kakao_id: kakaoId }, { onConflict: 'id' });

  let destination = next;
  if (next === '/home') {
    const { data: profile } = await supabase
      .from('saju_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .eq('relation_type', 'self')
      .maybeSingle();
    if (!profile) destination = '/onboarding/saju';
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
