import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuProfilePayload } from '@/lib/saju/profile_payload';
import { findDuplicateProfile } from '@/lib/saju/profile_dedup';
import { logger } from '@/lib/utils/logger';
import { recordEvent } from '@/lib/analytics/events';

const Body = z.object({
  name: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  isLunar: z.boolean(),
  isLeapMonth: z.boolean().optional(),
  gender: z.enum(['M', 'F']),
  relationType: z
    .enum(['self', 'family', 'friend', 'lover', 'colleague', 'other'])
    .default('self'),
  relationLabel: z.string().optional(),
});

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    return await handleCalculate(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('saju/calculate', 'unhandled exception', { error: msg });
    return NextResponse.json(
      { error: 'server_exception', detail: msg },
      { status: 500 },
    );
  }
}

async function handleCalculate(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_body', detail: String(e) },
      { status: 400 },
    );
  }

  // 카카오 OAuth 또는 anonymous 로그인으로 막 가입한 사용자는 auth.users는
  // 있어도 public.users 행이 아직 없을 수 있다. saju_profiles.owner_id가
  // public.users(id)를 참조하므로 먼저 보장. 이미 있으면 no-op.
  try {
    const admin = await createServerClient({ admin: true });
    const { error: userUpsertError } = await admin
      .from('users')
      .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (userUpsertError) {
      logger.warn('saju/calculate', 'users upsert failed (non-fatal)', {
        code: userUpsertError.code,
        message: userUpsertError.message,
      });
    }
  } catch (e) {
    logger.warn('saju/calculate', 'users upsert threw (non-fatal)', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  let payload;
  try {
    payload = buildSajuProfilePayload(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('saju/calculate', 'buildSajuProfilePayload failed', {
      message: msg,
      birthDate: body.birthDate,
      birthTime: body.birthTime,
      isLunar: body.isLunar,
    });
    return NextResponse.json(
      {
        error: 'saju_calc_failed',
        detail: `사주 계산 실패: ${msg}`,
      },
      { status: 400 },
    );
  }

  // 인연 추가/온보딩에서 같은 사람을 다시 보내면(더블탭·재시도·궁합계산 실패 후
  // 재등록) 새 프로필을 만들지 않고 기존 행을 그대로 돌려준다(멱등). 이게 없으면
  // /api/relations/compat 호출이 실패할 때마다 고아 프로필이 쌓여 중복이 생겼다.
  const existing = await findDuplicateProfile(supabase, user.id, payload);
  if (existing) {
    return NextResponse.json({ saju: existing, deduped: true });
  }

  const { data, error } = await supabase
    .from('saju_profiles')
    .insert({
      owner_id: user.id,
      ...payload,
    })
    .select()
    .single();

  if (error) {
    logger.error('saju/calculate', 'insert failed', {
      code: error.code,
      message: error.message,
      details: error.details,
      userId: user.id,
    });
    if (error.code === '23503') {
      return NextResponse.json(
        {
          error: 'profile_link_missing',
          detail: '계정 정보를 확인하지 못했어요. 다시 로그인해주세요.',
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: 'insert_failed', detail: error.message, code: error.code },
      { status: 500 },
    );
  }

  // 온보딩 활성화 — 본인 사주를 처음 만든 순간(신규 insert)만 퍼널에 기록.
  // 인연(가족/친구/연인…) 추가는 온보딩이 아니므로 제외한다.
  if (body.relationType === 'self') {
    after(() =>
      recordEvent({
        event: 'onboarding_complete',
        userId: user.id,
        props: { saju_id: data.id },
      }),
    );
  }

  return NextResponse.json({ saju: data });
}
