import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServerClient } from '@/lib/supabase/server';
import { serverAppOrigin } from '@/lib/app-url';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

// Create a 궁합 초대 link tied to the host's self saju.
export async function POST() {
  try {
    return await createInvite();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('relations/invite', 'unhandled exception', { error: msg });
    return NextResponse.json(
      { error: 'server_exception', detail: msg },
      { status: 500 },
    );
  }
}

async function createInvite() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: self } = await supabase
    .from('saju_profiles')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!self) return NextResponse.json({ error: 'no_self_profile' }, { status: 400 });

  // Make sure the public.users row exists (anonymous auth / direct OAuth sign-ups
  // may have an auth.users row without a corresponding public.users row, which
  // would violate the relation_invites.host_user_id FK). Best-effort — failures
  // here are logged but don't block the invite creation since the row probably
  // already exists.
  try {
    const admin = await createServerClient({ admin: true });
    const { error: userUpsertError } = await admin
      .from('users')
      .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (userUpsertError) {
      logger.warn('relations/invite', 'users upsert failed (non-fatal)', {
        code: userUpsertError.code,
        message: userUpsertError.message,
      });
    }
  } catch (e) {
    logger.warn('relations/invite', 'users upsert threw (non-fatal)', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Reuse a recent pending invite if one exists (avoid token spam).
  const { data: existing, error: lookupError } = await supabase
    .from('relation_invites')
    .select('token, expires_at')
    .eq('host_user_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    logger.error('relations/invite', 'lookup failed', {
      code: lookupError.code,
      message: lookupError.message,
    });
    // 42P01 = undefined_table → migration 8 hasn't been applied yet.
    if (lookupError.code === '42P01') {
      return NextResponse.json(
        {
          error: 'migration_missing',
          detail:
            'relation_invites 테이블이 없어요. Supabase에서 migration 8을 적용해주세요.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: 'lookup_failed',
        detail: `${lookupError.message ?? '알 수 없는 에러'} (code: ${lookupError.code ?? 'n/a'})`,
        code: lookupError.code,
      },
      { status: 500 },
    );
  }

  let token = existing?.token;
  if (!token) {
    token = randomBytes(12).toString('base64url');
    const { error } = await supabase.from('relation_invites').insert({
      token,
      host_user_id: user.id,
      host_saju_id: self.id,
      status: 'pending',
    });
    if (error) {
      logger.error('relations/invite', 'insert failed', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            error: 'migration_missing',
            detail:
              'relation_invites 테이블이 없어요. Supabase에서 migration 8을 적용해주세요.',
          },
          { status: 503 },
        );
      }
      if (error.code === '23503') {
        // foreign_key_violation — usually missing public.users row
        return NextResponse.json(
          {
            error: 'profile_link_missing',
            detail: `계정 정보 연결 실패 (${error.message ?? 'FK violation'}). 다시 로그인 후 시도해주세요.`,
            code: error.code,
          },
          { status: 500 },
        );
      }
      if (error.code === '42501') {
        // insufficient_privilege — RLS denied
        return NextResponse.json(
          {
            error: 'rls_denied',
            detail: `RLS 정책으로 거부됨 (${error.message ?? 'permission denied'}). 로그인 상태를 확인해주세요.`,
            code: error.code,
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          error: 'insert_failed',
          detail: `${error.message ?? '알 수 없는 에러'} (code: ${error.code ?? 'n/a'})`,
          code: error.code,
        },
        { status: 500 },
      );
    }
  }

  const url = `${serverAppOrigin()}/invite/${token}`;
  return NextResponse.json({ token, url, hostName: self.name });
}

// List host's invites (for the relations screen).
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('relation_invites')
    .select('token, status, guest_name, created_at, completed_at')
    .eq('host_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  return NextResponse.json({ invites: data ?? [] });
}
