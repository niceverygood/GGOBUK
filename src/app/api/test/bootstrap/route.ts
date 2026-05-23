import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import { logger } from '@/lib/utils/logger';
import { grantSignupBonusIfNeeded } from '@/lib/credits/server';
import { SIGNUP_BONUS_CREDITS } from '@/lib/credits';

const ProfileBody = z.object({
  name: z.string().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
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
  // Block in production unless explicitly allowed (e.g. for App Store review).
  // Set ALLOW_TEST_BOOTSTRAP=1 in Vercel env vars during review, remove after.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_TEST_BOOTSTRAP !== '1'
  ) {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json().catch(() => ({})));
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_body', detail: String(e) },
      { status: 400 },
    );
  }

  const profile = {
    ...DEFAULT_PROFILE,
    ...parsed.profile,
    name: parsed.profile?.name.trim() || DEFAULT_PROFILE.name,
  };
  const saju = buildSajuResult(profile);

  // Create the public.users row first (idempotent upsert). Credit grant
  // happens through the grant_signup_bonus RPC so it goes through
  // credit_transactions and is correctly recorded as a 'bonus'.
  const { error: userError } = await supabase
    .from('users')
    .upsert(
      { id: user.id, nickname: '테스트 꼬북이' },
      { onConflict: 'id' },
    );
  if (userError)
    return NextResponse.json({ error: userError.message }, { status: 500 });

  // Grant signup bonus (idempotent — RPC only credits once per account).
  let bonusBalance: number | null = null;
  try {
    bonusBalance = await grantSignupBonusIfNeeded(user.id);
  } catch (e) {
    logger.warn('test/bootstrap', 'signup bonus failed', { error: e instanceof Error ? e.message : String(e) });
  }
  const creditsApplied = bonusBalance !== null && bonusBalance > 0;

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
  if (existingError)
    return NextResponse.json({ error: existingError.message }, { status: 500 });

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
  if (profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 });

  const duplicateIds = (existingProfiles ?? []).slice(1).map((row) => row.id);
  if (duplicateIds.length > 0) {
    await supabase.from('saju_profiles').delete().in('id', duplicateIds);
  }

  // Clear any stale daily_fortunes row (e.g. legacy placeholder from older
  // bootstrap runs) so the home page re-triggers a real AI-generated one
  // tailored to the user's saju on next render.
  await supabase
    .from('daily_fortunes')
    .delete()
    .eq('saju_id', selfProfile.id);

  return NextResponse.json({
    ok: true,
    profile: selfProfile,
    credits: bonusBalance ?? 0,
    signupBonus: SIGNUP_BONUS_CREDITS,
    creditsApplied,
  });
}
