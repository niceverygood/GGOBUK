import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import {
  INTERPRETATION_CATEGORIES,
  generateFallbackInterpretation,
  generateInterpretation,
} from '@/lib/llm/interpret';
import { CREDIT_COSTS } from '@/lib/credits';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import {
  isAiConsentRequiredError,
  requireAiConsent,
} from '@/lib/privacy/consent';
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';
import type { InterpretationCategory, SajuProfileRow } from '@/types/db';

const Body = z.object({
  category: z.string(),
  focus: z.string().max(300).optional(),
  persona: z.enum(['kkobuk', 'dosa', 'mudang', 'bosal']).optional(),
  /** Deep-dive 보충 모드. 사용자가 이미 본문을 보고 있을 때, 그 본문 뒤에
   *  '심화: focus' 섹션을 이어붙여 저장한다. */
  appendTo: z.string().max(60000).optional(),
  /** Deep-dive 항목의 짧은 제목. LLM이 응답 첫 줄에 '## 심화 — {title}'로
   *  박아두면 클라이언트가 본문에서 grep해 소비된 항목을 식별할 수 있다. */
  title: z.string().max(100).optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 90;

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
      return NextResponse.json(
        { error: 'ai_consent_required' },
        { status: 412 },
      );
    }
    throw e;
  }

  const rl = rateLimit(rateLimitKey(user.id, 'interpretation'), 10, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { category, focus, persona: personaInput, appendTo, title } =
    Body.parse(await req.json());
  const persona = personaInput ?? 'dosa';
  const isAppend = Boolean(appendTo && focus);
  const cat = INTERPRETATION_CATEGORIES.find((item) => item.key === category);
  if (!cat)
    return NextResponse.json({ error: 'unknown_category' }, { status: 400 });

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<SajuProfileRow>();
  if (!profile)
    return NextResponse.json({ error: 'no profile' }, { status: 404 });

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  let creditsSpent = false;
  try {
    await spendCredits({
      userId: user.id,
      amount: CREDIT_COSTS.interpretation,
      reason: `사주 해설 ${focus ? '심화 ' : ''}생성:${category}`,
      referenceId: profile.id,
    });
    creditsSpent = true;
  } catch (e) {
    if (isInsufficientCreditsError(e)) {
      return NextResponse.json(
        { error: 'insufficient_credits' },
        { status: 402 },
      );
    }
    logger.warn('interpretations/regenerate', 'credit spend skipped', {
      userId: user.id,
      category,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  let result;
  try {
    result = await generateInterpretation(
      saju,
      category as InterpretationCategory,
      profile.name,
      focus,
      persona,
      isAppend,
      isAppend ? title : undefined,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    logger.error('interpretations/regenerate', 'llm failed; using fallback', {
      userId: user.id,
      category,
      message: msg,
    });
    if (creditsSpent) {
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.interpretation,
        reason: `사주 해설 AI 실패 환불:${category}`,
        kind: 'refund',
        referenceId: profile.id,
      }).catch(() => undefined);
      creditsSpent = false;
    }
    if (
      msg.includes('OPENROUTER_API_KEY') ||
      msg.includes('ANTHROPIC_API_KEY')
    ) {
      result = generateFallbackInterpretation(
        saju,
        category as InterpretationCategory,
        profile.name,
        focus,
      );
    } else {
      result = generateFallbackInterpretation(
        saju,
        category as InterpretationCategory,
        profile.name,
        focus,
      );
    }
  }

  // Supplement append: 기존 본문 + 구분선 + 새 심화 섹션 합쳐 저장.
  const mergedContent = isAppend && appendTo
    ? `${appendTo.trim()}\n\n---\n\n${result.content.trim()}`
    : result.content;

  const admin = await createServerClient({ admin: true });
  const { error } = await admin.from('interpretations').upsert(
    {
      saju_id: profile.id,
      category,
      persona,
      content: mergedContent,
      model: result.model,
      tokens_used: result.tokensUsed,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'saju_id,category,persona' },
  );
  if (error) {
    logger.error('interpretations/regenerate', 'cache save failed', {
      userId: user.id,
      category,
      message: error.message,
    });
  }
  if (error && creditsSpent)
    await addCredits({
      userId: user.id,
      amount: CREDIT_COSTS.interpretation,
      reason: `사주 해설 저장 실패 환불:${category}`,
      kind: 'refund',
      referenceId: profile.id,
    }).catch(() => undefined);

  return NextResponse.json({
    content: mergedContent,
    cached: !error,
    model: result.model,
  });
}
