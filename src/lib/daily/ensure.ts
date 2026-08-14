import { createServerClient } from '@/lib/supabase/server';
import { generateDaily } from '@/lib/llm/daily';
import { buildSajuResult } from '@/lib/saju';
import { calculatePalja } from '@/lib/saju/palja';
import type { SajuProfileRow } from '@/types/db';

function isMissingColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist|could not find the .* column/i.test(
      error.message ?? '',
    )
  );
}

export type EnsureDailyResult =
  | { ok: true; daily: Record<string, unknown>; cached: boolean }
  | { ok: false; reason: 'llm_not_configured' | 'failed'; message: string };

/**
 * 그 날짜의 daily_fortunes 행을 보장한다 — 있으면 그대로, 없으면 생성해서 저장.
 *
 * `/api/daily`(GET)와 `/api/bread/open` 이 같은 로직을 쓰기 위한 공용 헬퍼.
 * 호출자가 인증·소유권·AI 동의를 이미 확인했다고 가정한다.
 */
export async function ensureDailyFortune(params: {
  profile: SajuProfileRow;
  date: string;
}): Promise<EnsureDailyResult> {
  const { profile, date } = params;
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daily_fortunes')
    .select('*')
    .eq('saju_id', profile.id)
    .eq('date', date)
    .maybeSingle();
  if (existing) return { ok: true, daily: existing, cached: true };

  // 오늘의 일진 = 오늘 날짜를 사주로 환산했을 때의 일주
  const ilji = calculatePalja({
    birthDate: date,
    isLunar: false,
    gender: 'M',
  }).day;

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  let fortune;
  try {
    fortune = await generateDaily({
      saju,
      date,
      iljiGan: ilji.ganHanja,
      iljiJi: ilji.jiHanja,
      name: profile.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (
      message.includes('OPENROUTER_API_KEY') ||
      message.includes('ANTHROPIC_API_KEY')
    ) {
      return { ok: false, reason: 'llm_not_configured', message };
    }
    return { ok: false, reason: 'failed', message: message || 'daily failed' };
  }

  const admin = await createServerClient({ admin: true });

  const base = {
    saju_id: profile.id,
    date,
    ilji_gan: ilji.gan,
    ilji_ji: ilji.ji,
    one_liner: fortune.one_liner,
    lucky_color: fortune.lucky_color,
    lucky_number: fortune.lucky_number,
    lucky_direction: fortune.lucky_direction,
    recommend: fortune.recommend,
    avoid: fortune.avoid,
    mood: fortune.mood,
  };

  // ⚠️ migration 18 미적용 환경에는 daily_fortunes.lucky_food 컬럼이 없다.
  //    알 수 없는 컬럼이 섞이면 PostgREST 가 INSERT 전체를 거부하므로,
  //    컬럼 부재가 확인되면 해당 필드를 빼고 한 번 더 시도한다.
  let { data: inserted, error } = await admin
    .from('daily_fortunes')
    .insert({ ...base, lucky_food: fortune.lucky_food })
    .select()
    .single();

  if (error && isMissingColumn(error)) {
    ({ data: inserted, error } = await admin
      .from('daily_fortunes')
      .insert(base)
      .select()
      .single());
  }

  // 동시 요청으로 unique(saju_id, date) 충돌이 났다면 이미 만들어진 행을 돌려준다.
  if (error) {
    const { data: raced } = await supabase
      .from('daily_fortunes')
      .select('*')
      .eq('saju_id', profile.id)
      .eq('date', date)
      .maybeSingle();
    if (raced) return { ok: true, daily: raced, cached: true };
    return { ok: false, reason: 'failed', message: error.message };
  }

  return { ok: true, daily: inserted, cached: false };
}
