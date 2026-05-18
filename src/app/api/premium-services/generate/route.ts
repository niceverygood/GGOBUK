import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  PREMIUM_SERVICE_IDS,
  premiumServiceById,
} from '@/lib/premium-services';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import { generatePremiumServiceReport } from '@/lib/llm/premium_service';
import { buildSajuResult } from '@/lib/saju';
import { createServerClient } from '@/lib/supabase/server';
import type { SajuProfileRow } from '@/types/db';

const Body = z.object({
  serviceId: z.enum(PREMIUM_SERVICE_IDS),
  topic: z.string().max(300).optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 90;

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes('OPENROUTER_API_KEY') ||
    message.includes('ANTHROPIC_API_KEY')
  ) {
    return 'llm_not_configured';
  }
  return 'generation_failed';
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { serviceId, topic } = Body.parse(await req.json());
  const service = premiumServiceById(serviceId);
  if (!service)
    return NextResponse.json({ error: 'unknown_service' }, { status: 400 });

  if (service.requiresTopic && !topic?.trim()) {
    return NextResponse.json({ error: 'topic_required' }, { status: 400 });
  }

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

  try {
    await spendCredits({
      userId: user.id,
      amount: service.cost,
      reason: `프리미엄 운세 상품:${service.title}`,
      referenceId: profile.id,
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

  try {
    const result = await generatePremiumServiceReport({
      saju,
      name: profile.name,
      service,
      topic,
    });
    return NextResponse.json({
      serviceId: service.id,
      title: service.title,
      content: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    await addCredits({
      userId: user.id,
      amount: service.cost,
      reason: `프리미엄 운세 상품 실패 환불:${service.title}`,
      kind: 'refund',
      referenceId: profile.id,
    }).catch(() => undefined);

    console.error('[premium-services/generate] failed', {
      userId: user.id,
      serviceId,
      message: e instanceof Error ? e.message : String(e),
    });

    return NextResponse.json({ error: errorCode(e) }, { status: 500 });
  }
}
