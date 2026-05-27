import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { hasServiceRoleKey } from '@/lib/supabase/env';

/**
 * 임시 진단 엔드포인트.
 *
 * 환경변수 누락으로 인한 "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지
 * 않아…" 같은 에러를 진단하기 위해 만든 read-only 엔드포인트.
 *
 * 어떤 키 값 자체도 노출하지 않고, 존재 여부(boolean)만 반환한다.
 * 로그인된 사용자만 접근 가능 (auth.uid 가드).
 *
 * ⚠️ 확인 끝나면 이 파일 삭제해도 됨 (영구 유지 권장하지 않음).
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', detail: 'login required for /api/debug/env-check' },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  // Mask anything that looks like a JWT or secret — only return host portion.
  const supabaseHost = (() => {
    try {
      return new URL(supabaseUrl).host;
    } catch {
      return supabaseUrl ? '<invalid url>' : '';
    }
  })();

  // Boolean-only presence check. Length included as a sanity signal — service
  // role JWTs are typically ~200 chars. If length is <100, you likely pasted a
  // truncated key. If length is exactly equal to anon key length, you may have
  // pasted the anon key by mistake.
  const len = (k: string | undefined) => (k && k.trim() ? k.trim().length : 0);

  return NextResponse.json({
    // The decisive flag this whole exercise is about:
    hasServiceRoleKey: hasServiceRoleKey(),

    // Helpful sanity signals (no actual key material returned):
    supabaseUrl: supabaseHost || '<missing>',
    keyLengths: {
      SUPABASE_SERVICE_ROLE_KEY: len(process.env.SUPABASE_SERVICE_ROLE_KEY),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: len(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: len(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      ANTHROPIC_API_KEY: len(process.env.ANTHROPIC_API_KEY),
      OPENROUTER_API_KEY: len(process.env.OPENROUTER_API_KEY),
    },

    // Vercel build/runtime context — confirms which environment this route is
    // executing in. If this says "production" but hasServiceRoleKey is false,
    // your env var isn't checked for the Production environment.
    nodeEnv: process.env.NODE_ENV ?? '<unset>',
    vercelEnv: process.env.VERCEL_ENV ?? '<unset>',
    vercelRegion: process.env.VERCEL_REGION ?? '<unset>',
    // The git SHA of THIS build — verifies you're hitting the new deploy and
    // not a cached old one.
    vercelGitCommitSha: (process.env.VERCEL_GIT_COMMIT_SHA ?? '<unset>').slice(
      0,
      7,
    ),

    // Sanity check that the auth gate is working — should always match the
    // logged-in user.
    userId: user.id,

    // Live admin probes — see what supabase actually says when we use the
    // service_role key. This is the decisive diagnostic for "env says it's
    // set but spend_credits still fails".
    probes: await runAdminProbes(user.id),
  });
}

async function runAdminProbes(userId: string) {
  const result: Record<string, unknown> = {};

  // Probe 1: simple admin SELECT — exercises the key end-to-end.
  // If JWT secret is mismatched or the key is otherwise rejected, this fails
  // BEFORE any function-level permission check.
  try {
    const admin = await createServerClient({ admin: true });
    const { data, error } = await admin
      .from('users')
      .select('id, credit_balance')
      .eq('id', userId)
      .maybeSingle();
    result.adminSelect = error
      ? { ok: false, message: error.message, code: error.code, details: error.details }
      : { ok: true, rowFound: Boolean(data) };
  } catch (e) {
    result.adminSelect = {
      ok: false,
      thrown: true,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  // Probe 2: dry-run spend_credits with amount=0 to see the actual server error.
  // We do NOT swallow or rewrite the error here — raw message goes to the
  // response so we can see whether it's JWT, permission, function-not-found, etc.
  try {
    const admin = await createServerClient({ admin: true });
    const { data, error } = await admin.rpc('spend_credits', {
      p_user_id: userId,
      p_amount: 0,
      p_reason: 'debug_env_check',
      p_reference_id: null,
    });
    result.spendCreditsProbe = error
      ? {
          ok: false,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      : { ok: true, returned: data };
  } catch (e) {
    result.spendCreditsProbe = {
      ok: false,
      thrown: true,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  return result;
}
