import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle, ScrollText } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { MyIljuHero } from '@/components/home/MyIljuHero';
import { TodayScoreHero } from '@/components/home/TodayScoreHero';
import { WelcomeBonusCard } from '@/components/home/WelcomeBonusCard';
import { BetaFreeBadge } from '@/components/home/BetaFreeBadge';
import { todayKstIso } from '@/lib/utils/date';
import type { Palja, SajuInput } from '@/lib/saju/types';

/**
 * 홈 = 앱의 전부가 한 화면에.
 * 1) 내 일주 정체성(평생 불변의 나) 2) 오늘의 운세 3) 진입 버튼 2개(풀이·채팅).
 */
export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) redirect('/onboarding/saju');

  const today = todayKstIso();
  const { data: daily } = await supabase
    .from('daily_fortunes')
    .select('*')
    .eq('saju_id', profile.id)
    .eq('date', today)
    .maybeSingle();

  const palja = profile.palja as Palja;
  const calendarInput: SajuInput = {
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  };

  return (
    <main className="relative px-5 pb-32 pt-8">
      <div>
        <p className="text-xs font-extrabold text-muted">오늘도 꼬북점 🐢</p>
        <h1 className="mt-0.5 text-lg font-black text-navy">
          {profile.name}님, 안녕하세요
        </h1>
      </div>

      {/* ════════ 나 — 내 일주 정체성 ════════ */}
      <div className="mt-4">
        <MyIljuHero
          name={profile.name}
          day={palja.day}
          birthDate={profile.birth_date}
          birthTime={profile.birth_time ?? null}
          isLunar={profile.is_lunar}
          gender={profile.gender}
        />
      </div>

      {/* ════════ 오늘의 나 (매일 바뀌는 일진) ════════ */}
      <div className="mt-7">
        <TodayScoreHero
          name={profile.name}
          sajuInput={calendarInput}
          sajuId={profile.id}
          oneLiner={daily?.one_liner ?? null}
          recommend={daily?.recommend ?? []}
        />
      </div>

      {/* ════════ 할 수 있는 일 2가지 — 풀이 · 채팅 ════════ */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        <Link
          href="/shell"
          prefetch
          className="flex min-h-28 flex-col justify-between rounded-3xl border border-navy/10 bg-white p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)] transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mint/20 text-navy">
            <ScrollText size={21} strokeWidth={2.5} />
          </span>
          <span>
            <span className="block text-sm font-black text-navy">
              내 사주 풀이
            </span>
            <span className="mt-0.5 block text-[11px] font-bold text-muted">
              내 사주 전체를 한 편으로
            </span>
          </span>
        </Link>
        <Link
          href="/chat"
          prefetch
          className="flex min-h-28 flex-col justify-between rounded-3xl border border-navy/10 bg-white p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)] transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold/25 text-navy">
            <MessageCircle size={21} strokeWidth={2.5} />
          </span>
          <span>
            <span className="block text-sm font-black text-navy">
              꼬북이랑 대화
            </span>
            <span className="mt-0.5 block text-[11px] font-bold text-muted">
              궁금한 건 바로 물어보기
            </span>
          </span>
        </Link>
      </div>

      <WelcomeBonusCard />
      <BetaFreeBadge />
    </main>
  );
}
