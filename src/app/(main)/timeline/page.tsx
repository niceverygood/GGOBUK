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

  const [userResult, profileResult] = await Promise.all([
    supabase.from('users').select('is_pro').eq('id', user.id).single(),
    supabase
      .from('saju_profiles')
      .select('daewoon')
      .eq('owner_id', user.id)
      .eq('relation_type', 'self')
      .maybeSingle(),
  ]);

  if (!userResult.data?.is_pro) redirect('/more/pro');
  if (!profileResult.data) redirect('/onboarding/saju');

  return <TimelineClient daewoon={(profileResult.data.daewoon ?? []) as DaewoonPeriod[]} />;
}
