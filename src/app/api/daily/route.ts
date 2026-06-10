import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { hasAiConsent } from '@/lib/privacy/consent';
import { generateDaily } from '@/lib/llm/daily';
import { loadUserMemory, formatUserMemory } from '@/lib/llm/memory';
import { buildSajuResult } from '@/lib/saju';
import { calculatePalja } from '@/lib/saju/palja';
import { todayKstIso } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import { sendPush, isPushConfigured } from '@/lib/push/send';
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

  // 캐시 미스 → 새 생성 = AI 호출. 동의 여부 확인.
  if (!(await hasAiConsent(user.id))) {
    return NextResponse.json(
      { daily: null, error: 'ai_consent_required' },
      { status: 412 },
    );
  }

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

  // 본인 운세일 때만 사용자 기억 주입 — 지인 프로필 운세에 내 기억이 섞이면 안 됨.
  const memory =
    profile.relation_type === 'self'
      ? formatUserMemory(await loadUserMemory(supabase, user.id))
      : '';

  let fortune;
  try {
    fortune = await generateDaily({
      saju,
      date: today,
      iljiGan: ilji.ganHanja,
      iljiJi: ilji.jiHanja,
      name: profile.name,
      memory,
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
  // Cron endpoint. Authenticate via Vercel Cron header or shared secret.
  const vercelCronAuth = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  const legacyCronAuth = req.headers.get('x-cron-secret') === process.env.CRON_SECRET;
  if (process.env.CRON_SECRET && !vercelCronAuth && !legacyCronAuth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = await createServerClient({ admin: true });
  const today = todayKstIso();

  // 동의한 사용자의 self profile 만 생성. 미동의자는 cron 에서도 LLM 호출 금지.
  const { data: consentedUsers } = await admin
    .from('users')
    .select('id')
    .not('ai_consent_at', 'is', null);
  const consentedIds = new Set((consentedUsers ?? []).map((u) => u.id));

  const { data: allProfiles } = await admin
    .from('saju_profiles')
    .select('*')
    .eq('relation_type', 'self')
    .returns<SajuProfileRow[]>();
  const profiles = (allProfiles ?? []).filter((p) => consentedIds.has(p.owner_id));

  let generated = 0;
  let failed = 0;

  for (const profile of profiles) {
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
      // cron 은 전부 self 프로필 — owner 의 기억을 주입해 "나를 아는" 아침 운세로.
      const memory = formatUserMemory(
        await loadUserMemory(admin, profile.owner_id),
      );
      const fortune = await generateDaily({
        saju,
        date: today,
        iljiGan: ilji.ganHanja,
        iljiJi: ilji.jiHanja,
        name: profile.name,
        memory,
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
      logger.error('daily', 'generation failed', { profileId: profile.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // ── 푸시 발송 — push 켠 사용자에게 그날의 한 줄 운세 ──
  let pushed = 0;
  let pushExpired = 0;
  if (isPushConfigured()) {
    const { data: pushUsers } = await admin
      .from('users')
      .select('id, push_token')
      .eq('push_enabled', true)
      .not('push_token', 'is', null);

    // owner_id → self profile id 매핑 (이번에 처리한 profiles 기준)
    const ownerToProfile = new Map(profiles.map((p) => [p.owner_id, p.id]));

    for (const u of pushUsers ?? []) {
      const profileId = ownerToProfile.get(u.id);
      if (!profileId) continue; // 미동의·프로필 없음 → 운세 없어 skip

      const { data: fortune } = await admin
        .from('daily_fortunes')
        .select('one_liner')
        .eq('saju_id', profileId)
        .eq('date', today)
        .maybeSingle();
      if (!fortune?.one_liner) continue;

      const result = await sendPush(u.push_token, {
        title: '🐢 오늘의 한 줄',
        body: fortune.one_liner,
        url: '/home',
        tag: 'ggobuk-daily',
      });
      if (result.ok) {
        pushed += 1;
      } else if (result.expired) {
        // 만료/해지된 구독 정리 — 다음 발송 때 제외.
        pushExpired += 1;
        await admin
          .from('users')
          .update({ push_token: null, push_enabled: false })
          .eq('id', u.id);
      }
    }
  }

  return NextResponse.json({ generated, failed, pushed, pushExpired, date: today });
}
