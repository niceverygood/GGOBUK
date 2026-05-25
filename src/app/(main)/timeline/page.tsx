import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TimelineClient } from './TimelineClient';
import { buildSajuResult } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';

export default async function TimelinePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('birth_date,birth_time,is_lunar,is_leap_month,gender')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();

  if (!profile) redirect('/onboarding/saju');

  const sajuInput: SajuInput = {
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  };
  const saju = buildSajuResult(sajuInput);

  return <TimelineClient saju={saju} />;
}
