import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { FortuneCalendar } from '@/components/calendar/FortuneCalendar';
import type { SajuInput } from '@/lib/saju/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('name, birth_date, birth_time, is_lunar, is_leap_month, gender')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) redirect('/onboarding/saju');

  const input: SajuInput = {
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  };

  return (
    <main className="px-5 pt-8 pb-28 relative">
      <div className="hanji-overlay" />
      <div className="relative pr-12">
        <p className="text-xs font-extrabold text-muted">날짜별 일진 길흉</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-navy">운세 달력</h1>
        <p className="mt-1 text-xs font-bold text-muted">
          {profile.name}님 사주 기준 · 날짜를 누르면 그날의 흐름이 보여요.
        </p>

        <div className="mt-5">
          <FortuneCalendar input={input} name={profile.name} />
        </div>
      </div>
    </main>
  );
}
