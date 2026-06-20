import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import {
  INTERPRETATION_CATEGORIES,
  generateInterpretationHook,
} from '@/lib/llm/interpret';
import { isFreeInterpretation } from '@/lib/credits';
import {
  isAiConsentRequiredError,
  requireAiConsent,
} from '@/lib/privacy/consent';
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';
import type { InterpretationCategory, SajuProfileRow } from '@/types/db';

// 호기심 갭 "훅"(미끼) 생성 — 잠긴 유료 풀이의 첫 2~3문장만 무료로 보여준다.
// ⚠️ spendCredits 미호출(미끼는 항상 무료) · interpretations 테이블 미저장
// (본문 캐시 오염·무료 우회 방지). 무차감이라 어뷰징 방어선은 rate limit뿐.

const Body = z.object({
  category: z.string(),
  persona: z.enum(['kkobuk', 'dosa', 'mudang', 'bosal']).optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    await requireAiConsent(user.id);
  } catch (e) {
    if (isAiConsentRequiredError(e)) {
      return NextResponse.json({ error: 'ai_consent_required' }, { status: 412 });
    }
    throw e;
  }

  const rl = rateLimit(rateLimitKey(user.id, 'interp-hook'), 30, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { category, persona: personaInput } = Body.parse(await req.json());
  const persona = personaInput ?? 'kkobuk';
  const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category);
  if (!cat)
    return NextResponse.json({ error: 'unknown_category' }, { status: 400 });
  // 무료 카테고리는 본문이 바로 무료라 훅이 필요 없다.
  if (isFreeInterpretation(category))
    return NextResponse.json({ error: 'free_category' }, { status: 400 });

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<SajuProfileRow>();
  if (!profile)
    return NextResponse.json({ error: 'no_profile' }, { status: 404 });

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  try {
    const { hook } = await generateInterpretationHook(
      saju,
      category as InterpretationCategory,
      profile.name,
      persona,
    );
    return NextResponse.json({ hook });
  } catch (e) {
    // 훅 실패해도 UI는 일반 페이월로 폴백해야 하므로 200 + hook:null.
    logger.warn('interpretations/hook', 'hook gen failed', {
      category,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ hook: null });
  }
}
