import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import { calculatePalja } from '@/lib/saju/palja';
import { todayKstIso } from '@/lib/utils/date';

const ProfileBody = z.object({
  name: z.string().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isLunar: z.boolean(),
  isLeapMonth: z.boolean().optional(),
  gender: z.enum(['M', 'F']),
});

const Body = z.object({
  profile: ProfileBody.optional(),
});

const DEFAULT_PROFILE = {
  name: '테스트',
  birthDate: '1985-11-14',
  birthTime: '14:05',
  isLunar: false,
  isLeapMonth: false,
  gender: 'M' as const,
};

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json().catch(() => ({})));
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body', detail: String(e) }, { status: 400 });
  }

  const profile = {
    ...DEFAULT_PROFILE,
    ...parsed.profile,
    name: parsed.profile?.name.trim() || DEFAULT_PROFILE.name,
  };
  const saju = buildSajuResult(profile);
  const proExpiresAt = new Date();
  proExpiresAt.setFullYear(proExpiresAt.getFullYear() + 1);

  const { error: userError } = await supabase.from('users').upsert(
    {
      id: user.id,
      nickname: '테스트 꼬북이',
      is_pro: true,
      pro_expires_at: proExpiresAt.toISOString(),
    },
    { onConflict: 'id' },
  );
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  const profilePayload = {
    owner_id: user.id,
    name: profile.name,
    birth_date: profile.birthDate,
    birth_time: profile.birthTime ?? null,
    is_lunar: profile.isLunar,
    is_leap_month: profile.isLeapMonth ?? false,
    gender: profile.gender,
    relation_type: 'self',
    relation_label: '테스트',
    palja: saju.palja,
    ohaeng_count: saju.ohaengCount,
    sipsung: saju.sipsung,
    sinsal: saju.sinsal,
    daewoon: saju.daewoon,
    ilgan: saju.ilgan,
  };

  const { data: existingProfiles, error: existingError } = await supabase
    .from('saju_profiles')
    .select('id')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .order('created_at', { ascending: true });
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const selfId = existingProfiles?.[0]?.id;
  const { data: selfProfile, error: profileError } = selfId
    ? await supabase
        .from('saju_profiles')
        .update(profilePayload)
        .eq('id', selfId)
        .select()
        .single()
    : await supabase
        .from('saju_profiles')
        .insert(profilePayload)
        .select()
        .single();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const duplicateIds = (existingProfiles ?? []).slice(1).map((row) => row.id);
  if (duplicateIds.length > 0) {
    await supabase.from('saju_profiles').delete().in('id', duplicateIds);
  }

  const today = todayKstIso();
  const ilji = calculatePalja({ birthDate: today, isLunar: false, gender: 'M' }).day;
  const { error: dailyError } = await supabase.from('daily_fortunes').upsert(
    {
      saju_id: selfProfile.id,
      date: today,
      ilji_gan: ilji.gan,
      ilji_ji: ilji.ji,
      one_liner: '오늘은 테스트 꼬북이가 실제 서비스 흐름을 함께 둘러보기 좋은 날이야.',
      lucky_color: '민트',
      lucky_number: 8,
      lucky_direction: '동쪽',
      recommend: ['등껍질 해설 살펴보기', '꼬북도사에게 질문해보기', '페르소나를 바꿔 말투 비교하기'],
      avoid: ['미리보기 화면에만 머물기'],
      mood: 'happy',
    },
    { onConflict: 'saju_id,date' },
  );
  if (dailyError) return NextResponse.json({ error: dailyError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    profile: selfProfile,
    isPro: true,
  });
}
