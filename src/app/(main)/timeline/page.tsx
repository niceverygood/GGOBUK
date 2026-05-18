import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TimelineClient } from './TimelineClient';
import type { DaewoonPeriod } from '@/lib/saju/types';

export default async function TimelinePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('daewoon')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();

  if (!profile) redirect('/onboarding/saju');

  return (
    <TimelineClient daewoon={(profile.daewoon ?? []) as DaewoonPeriod[]} />
  );
}
