import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { calculatePalja } from '@/lib/saju/palja';
import { buildSajuResult } from '@/lib/saju';
import { enrichAuspiciousSuggestions } from '@/lib/llm/auspicious';
import { CREDIT_COSTS } from '@/lib/credits';
import { isInsufficientCreditsError, spendCredits } from '@/lib/credits/server';
import { CHEONGAN_OHAENG_IDX, JIJI_OHAENG_IDX } from '@/lib/saju/constants';
import type { Palja } from '@/lib/saju/types';
import type { SajuProfileRow } from '@/types/db';

const Body = z.object({
  purpose: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const runtime = 'nodejs';
export const maxDuration = 90;

const PURPOSE_PREFERRED_OHAENG: Record<string, number[]> = {
  이사: [2, 3], // 토, 금
  계약: [3, 2], // 금, 토
  결혼: [0, 1], // 목, 화
  출장: [0, 3], // 목, 금
  개업: [1, 0], // 화, 목
};

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { purpose, start, end } = Body.parse(await req.json());

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<SajuProfileRow>();
  if (!profile?.palja)
    return NextResponse.json({ error: 'no profile' }, { status: 404 });

  try {
    await spendCredits({
      userId: user.id,
      amount: CREDIT_COSTS.auspicious,
      reason: `길일 찾기:${purpose}`,
      referenceId: `${start}_${end}`,
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

  const palja = profile.palja as Palja;
  const ilganIdx = palja.day.ganIdx;
  const ilganOhaeng = CHEONGAN_OHAENG_IDX[ilganIdx];
  const preferred = PURPOSE_PREFERRED_OHAENG[purpose] ?? [
    (ilganOhaeng + 1) % 5,
  ];

  const startD = new Date(start + 'T12:00:00');
  const endD = new Date(end + 'T12:00:00');
  const suggestions: Array<{
    date: string;
    reason: string;
    score: number;
    dayPillar: string;
  }> = [];

  for (
    let d = new Date(startD);
    d <= endD && suggestions.length < 100;
    d.setDate(d.getDate() + 1)
  ) {
    const iso = d.toISOString().slice(0, 10);
    const ilji = calculatePalja({
      birthDate: iso,
      isLunar: false,
      gender: 'M',
    }).day;
    const dayGanOhaeng = CHEONGAN_OHAENG_IDX[ilji.ganIdx];
    const dayJiOhaeng = JIJI_OHAENG_IDX[ilji.jiIdx];
    let score = 50;
    const reasons: string[] = [];

    if (preferred.includes(dayGanOhaeng)) {
      score += 20;
      reasons.push(`${purpose}에 좋은 ${ilji.ganOhaeng}일`);
    }
    if (preferred.includes(dayJiOhaeng)) {
      score += 15;
      reasons.push(`지지가 ${ilji.jiOhaeng} (보조 길)`);
    }
    // 일간과 그날 일간이 같으면 자기 기운 강화
    if (ilji.ganIdx === ilganIdx) {
      score += 8;
      reasons.push('본인 기운이 강한 날');
    }
    // 충은 감점
    const chungPairs = [
      [0, 6],
      [1, 7],
      [2, 8],
      [3, 9],
      [4, 10],
      [5, 11],
    ];
    if (
      chungPairs.some(
        ([a, b]) =>
          (a === ilji.jiIdx && b === palja.day.jiIdx) ||
          (b === ilji.jiIdx && a === palja.day.jiIdx),
      )
    ) {
      score -= 25;
      reasons.push('일지와 충 — 피하는 게 좋아');
    }

    if (score >= 65) {
      suggestions.push({
        date: iso,
        reason: reasons.join(' · ') || '무난한 흐름',
        score: Math.min(100, score),
        dayPillar: `${ilji.ganHanja}${ilji.jiHanja} (${ilji.gan}${ilji.ji})`,
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  const top = suggestions.slice(0, 10);
  try {
    const saju = buildSajuResult({
      birthDate: profile.birth_date,
      birthTime: profile.birth_time ?? undefined,
      isLunar: profile.is_lunar,
      isLeapMonth: profile.is_leap_month,
      gender: profile.gender,
    });
    const enriched = await enrichAuspiciousSuggestions({
      saju,
      name: profile.name,
      purpose,
      start,
      end,
      candidates: top,
    });
    return NextResponse.json({ suggestions: enriched });
  } catch {
    return NextResponse.json({
      suggestions: top.map(({ dayPillar, ...suggestion }) => {
        void dayPillar;
        return suggestion;
      }),
    });
  }
}
