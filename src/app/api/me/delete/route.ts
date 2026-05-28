import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import {
  supabaseUrl,
  hasServiceRoleKey,
  supabaseServiceKey,
} from '@/lib/supabase/env';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * App Store 5.1.1(v) — 계정 삭제.
 *
 * 흐름:
 *   1. 현재 세션의 사용자 확인.
 *   2. service-role 키로 auth.users 행 삭제 → public.users 에 걸린
 *      `on delete cascade` 체인이 saju_profiles, chat_*, relations, subscriptions,
 *      usage_logs, daily_fortunes, interpretation_comics, saju_shares 등 모두 정리.
 *   3. 현재 디바이스 세션도 즉시 sign out.
 *
 * 주의: service-role 키 미설정이면 절대 진행하지 않는다. RLS 만으로는
 *      auth.users 행을 사용자 본인이 지울 수 없다.
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 사용자가 명시적으로 "삭제"를 타이핑했는지 확인 — 우발 삭제 방지.
  let confirm = '';
  try {
    const body = (await req.json().catch(() => ({}))) as { confirm?: string };
    confirm = body.confirm ?? '';
  } catch {
    // ignore
  }
  if (confirm.trim() !== '삭제') {
    return NextResponse.json(
      { error: 'confirm_required', message: '확인을 위해 "삭제"를 정확히 입력해줘.' },
      { status: 400 },
    );
  }

  if (!hasServiceRoleKey()) {
    logger.error(
      'me/delete',
      'SUPABASE_SERVICE_ROLE_KEY missing — cannot delete auth user',
      { userId: user.id },
    );
    return NextResponse.json(
      {
        error: 'service_unavailable',
        message: '계정 삭제 기능이 일시적으로 비활성화돼 있어. 운영자에게 문의해줘.',
      },
      { status: 503 },
    );
  }

  // Admin 클라이언트는 service-role 키 직접 사용 (cookie/ssr 우회).
  const admin = createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    logger.error('me/delete', 'auth.admin.deleteUser failed', {
      userId: user.id,
      error: deleteError.message,
    });
    return NextResponse.json(
      { error: 'delete_failed', message: deleteError.message },
      { status: 500 },
    );
  }

  // 로컬 세션 종료. signOut 실패해도 어차피 user 가 없어졌으니 무시.
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}
