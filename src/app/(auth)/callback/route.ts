import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/home';

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Ensure a row exists in public.users.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const meta = (user.user_metadata ?? {}) as { nickname?: string; name?: string };
      const nickname = meta.nickname ?? meta.name ?? null;
      await supabase
        .from('users')
        .upsert({ id: user.id, nickname, kakao_id: user.app_metadata?.provider_id ?? null }, { onConflict: 'id' });
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
