import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { hasAiConsent } from '@/lib/privacy/consent';
import { buildSajuResult } from '@/lib/saju';
import { generateCompat } from '@/lib/llm/compat';
import { quickCompat } from '@/lib/saju/quick_compat';
import { CREDIT_COSTS } from '@/lib/credits';
import { isPersonaKey } from '@/lib/utils/persona-mode';
import type { PersonaKey } from '@/lib/llm/personas';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import { logger } from '@/lib/utils/logger';
import type { SajuProfileRow } from '@/types/db';

const Body = z.object({
  saju_b_id: z.string().uuid(),
  relation_label: z.string().optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 90;

function rowToSajuInput(row: SajuProfileRow) {
  return buildSajuResult({
    birthDate: row.birth_date,
    birthTime: row.birth_time ?? undefined,
    isLunar: row.is_lunar,
    isLeapMonth: row.is_leap_month,
    gender: row.gender,
  });
}

export async function POST(req: Request) {
  try {
    return await handleCompat(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('relations/compat', 'unhandled exception', { error: msg });
    return NextResponse.json(
      { error: 'compat_failed', detail: msg },
      { status: 500 },
    );
  }
}

async function handleCompat(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!(await hasAiConsent(user.id))) {
    return NextResponse.json({ error: 'ai_consent_required' }, { status: 412 });
  }

  const body = Body.parse(await req.json());

  const { data: selfProfile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<SajuProfileRow>();
  if (!selfProfile)
    return NextResponse.json({ error: 'no self profile' }, { status: 404 });

  const { data: otherProfile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('id', body.saju_b_id)
    .eq('owner_id', user.id)
    .maybeSingle<SajuProfileRow>();
  if (!otherProfile)
    return NextResponse.json({ error: 'other not found' }, { status: 404 });

  const sajuA = rowToSajuInput(selfProfile);
  const sajuB = rowToSajuInput(otherProfile);

  try {
    await spendCredits({
      userId: user.id,
      amount: CREDIT_COSTS.compatibility,
      reason: '궁합 AI 리포트',
      referenceId: otherProfile.id,
    });
  } catch (e) {
    if (isInsufficientCreditsError(e)) {
      return NextResponse.json(
        { error: 'insufficient_credits' },
        { status: 402 },
      );
    }
    throw e;
  }

  // 현재 사용자가 선택한 모드를 cookie에서 읽어 compat 톤에 적용.
  const cookieStore = await cookies();
  const personaRaw = cookieStore.get('ggobuk_persona_mode')?.value ?? 'dosa';
  const persona: PersonaKey = isPersonaKey(personaRaw) ? personaRaw : 'dosa';

  let result;
  let usedFallback = false;
  try {
    result = await generateCompat({
      sajuA,
      sajuB,
      nameA: selfProfile.name,
      nameB: otherProfile.name,
      relationLabel:
        body.relation_label ?? otherProfile.relation_label ?? undefined,
      persona,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    logger.error('relations/compat', 'generateCompat failed', {
      message: msg,
      userId: user.id,
      saju_b_id: body.saju_b_id,
    });
    // LLM 키 미설정·타임아웃·기타 — rule-based fallback으로라도 결과 제공.
    // 사용자가 "compat failed" 일반 에러로 멈추지 않고 점수+한 줄은 받게.
    try {
      const fb = quickCompat(sajuA.palja, sajuB.palja);
      const verdictLine =
        fb.score >= 75
          ? '서로 잘 끌어주는 결이 보이는 조합'
          : fb.score >= 55
            ? '강점과 긴장이 함께 있는 조합'
            : '거리 조절이 필요한 조합';
      result = {
        score: fb.score,
        headline: `${selfProfile.name}님과 ${otherProfile.name}님 — ${verdictLine}`,
        verdict: '간이 분석 결과예요. AI 풀이가 잠시 불안정해 규칙 기반으로 계산했어요.',
        hap: fb.hap,
        chung: fb.chung,
        highlights: fb.hap.slice(0, 3).map((h) => `${h} — 서로 끌어주는 결`),
        cautions: fb.chung.slice(0, 3).map((c) => `${c} — 거리 조절 필요`),
        summary: `${fb.hap.length}개 합, ${fb.chung.length}개 충이 잡혔어요. 깊은 풀이는 잠시 후 다시 시도해주세요.`,
        actionTips: [],
      };
      usedFallback = true;
    } catch (fbErr) {
      // fallback도 실패하면 환불 + 에러 노출
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.compatibility,
        reason: '궁합 AI 리포트 실패 환불',
        kind: 'refund',
        referenceId: otherProfile.id,
      }).catch(() => undefined);
      const fbMsg = fbErr instanceof Error ? fbErr.message : '';
      return NextResponse.json(
        {
          error: 'compat_failed',
          detail: `${msg || 'AI 응답 없음'}${fbMsg ? ` · fallback: ${fbMsg}` : ''}`,
        },
        { status: 500 },
      );
    }
  }

  // Upsert the relation edge
  const { data: existing } = await supabase
    .from('relations')
    .select('id')
    .eq('saju_a_id', selfProfile.id)
    .eq('saju_b_id', otherProfile.id)
    .maybeSingle();
  let relationId = existing?.id;
  if (existing) {
    const { error } = await supabase
      .from('relations')
      .update({ compatibility: result })
      .eq('id', existing.id);
    if (error) {
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.compatibility,
        reason: '궁합 AI 리포트 저장 실패 환불',
        kind: 'refund',
        referenceId: otherProfile.id,
      }).catch(() => undefined);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('relations')
      .insert({
        user_id: user.id,
        saju_a_id: selfProfile.id,
        saju_b_id: otherProfile.id,
        compatibility: result,
      })
      .select('id')
      .single();
    if (error) {
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.compatibility,
        reason: '궁합 AI 리포트 저장 실패 환불',
        kind: 'refund',
        referenceId: otherProfile.id,
      }).catch(() => undefined);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    relationId = inserted.id;
  }

  return NextResponse.json({ result, relationId, usedFallback });
}
