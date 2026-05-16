import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateDaily } from '@/lib/llm/daily';
import { buildSajuResult } from '@/lib/saju';
import { calculatePalja } from '@/lib/saju/palja';
import { todayKstIso } from '@/lib/utils/date';
import type { SajuProfileRow } from '@/types/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

// On-demand: GET /api/daily?saju_id=...
// Bulk:     POST /api/daily  (cron — generates for all self profiles for today)
export async function GET(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sajuId = url.searchParams.get('saju_id');
  if (!sajuId) return NextResponse.json({ error: 'saju_id required' }, { status: 400 });

  const today = todayKstIso();

  const { data: existing } = await supabase
    .from('daily_fortunes')
    .select('*')
    .eq('saju_id', sajuId)
    .eq('date', today)
    .maybeSingle();
  if (existing) return NextResponse.json({ daily: existing, cached: true });

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('id', sajuId)
    .single();
  if (!profile) return NextResponse.json({ error: 'profile not found' }, { status: 404 });

  const ilji = calculatePalja({
    birthDate: today,
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
      date: today,
      iljiGan: ilji.ganHanja,
      iljiJi: ilji.jiHanja,
      name: profile.name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('OPENROUTER_API_KEY') || msg.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json({ daily: null, error: 'llm_not_configured' }, { status: 503 });
    }
    return NextResponse.json({ error: msg || 'daily failed' }, { status: 500 });
  }

  const admin = await createServerClient({ admin: true });
  const { data: inserted } = await admin
    .from('daily_fortunes')
    .insert({
      saju_id: sajuId,
      date: today,
      ilji_gan: ilji.gan,
      ilji_ji: ilji.ji,
      one_liner: fortune.one_liner,
      lucky_color: fortune.lucky_color,
      lucky_number: fortune.lucky_number,
      lucky_direction: fortune.lucky_direction,
      recommend: fortune.recommend,
      avoid: fortune.avoid,
      mood: fortune.mood,
    })
    .select()
    .single();

  return NextResponse.json({ daily: inserted, cached: false });
}

export async function POST(req: Request) {
  // Cron endpoint. Authenticate via shared secret header.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get('x-cron-secret');
    if (provided !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = await createServerClient({ admin: true });
  const today = todayKstIso();

  const { data: profiles } = await admin
    .from('saju_profiles')
    .select('*')
    .eq('relation_type', 'self')
    .returns<SajuProfileRow[]>();

  let generated = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    const { data: existing } = await admin
      .from('daily_fortunes')
      .select('id')
      .eq('saju_id', profile.id)
      .eq('date', today)
      .maybeSingle();
    if (existing) continue;

    try {
      const ilji = calculatePalja({ birthDate: today, isLunar: false, gender: 'M' }).day;
      const saju = buildSajuResult({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time ?? undefined,
        isLunar: profile.is_lunar,
        isLeapMonth: profile.is_leap_month,
        gender: profile.gender,
      });
      const fortune = await generateDaily({
        saju,
        date: today,
        iljiGan: ilji.ganHanja,
        iljiJi: ilji.jiHanja,
        name: profile.name,
      });
      await admin.from('daily_fortunes').insert({
        saju_id: profile.id,
        date: today,
        ilji_gan: ilji.gan,
        ilji_ji: ilji.ji,
        one_liner: fortune.one_liner,
        lucky_color: fortune.lucky_color,
        lucky_number: fortune.lucky_number,
        lucky_direction: fortune.lucky_direction,
        recommend: fortune.recommend,
        avoid: fortune.avoid,
        mood: fortune.mood,
      });
      generated++;
    } catch (e) {
      failed++;
      console.error('daily generation failed', profile.id, e);
    }
  }

  return NextResponse.json({ generated, failed, date: today });
}
