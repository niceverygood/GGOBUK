import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle, ScrollText } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { resolveRepresentativeProfile } from '@/lib/profiles/resolve';
import { MyIljuHero } from '@/components/home/MyIljuHero';
import { TodayScoreHero } from '@/components/home/TodayScoreHero';
import { TurtleBread } from '@/components/home/TurtleBread';
import { MonthlyTeaser } from '@/components/home/MonthlyTeaser';
import { WelcomeBonusCard } from '@/components/home/WelcomeBonusCard';
import { BetaFreeBadge } from '@/components/home/BetaFreeBadge';
import { todayKstIso, currentYearMonthKst } from '@/lib/utils/date';
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

  const resolved = await resolveRepresentativeProfile(supabase, user.id);
  if (!resolved.ok) redirect('/onboarding/saju');
  const profile = resolved.profile;

  const today = todayKstIso();
  const yearMonth = currentYearMonthKst();

  const [{ data: daily }, { data: breadOpen }, { data: userRow }, { data: monthly }] =
    await Promise.all([
      supabase
        .from('daily_fortunes')
        .select('*')
        .eq('saju_id', profile.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('bread_opens')
        .select('is_golden')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('users')
        .select('bread_stamps')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('monthly_readings')
        .select('tier, content')
        .eq('saju_id', profile.id)
        .eq('year_month', yearMonth),
    ]);

  // 거북빵을 열어야 그날 운세가 보인다. 이미 열었으면(=bread_opens 행 존재) 내용 노출.
  const openedToday = Boolean(breadOpen);
  const monthlyRows = monthly ?? [];
  const monthlySummary =
    monthlyRows.find((r) => r.tier === 'summary')?.content ?? null;
  const hasMonthlyDetail = monthlyRows.some((r) => r.tier === 'detail');

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

      {/* ════════ 오늘의 거북빵 — 매일 무료로 여는 하루 1회 의식 ════════ */}
      <div className="mt-7">
        <TurtleBread
          openedToday={openedToday}
          initialDaily={
            openedToday && daily
              ? {
                  one_liner: daily.one_liner,
                  lucky_color: daily.lucky_color ?? null,
                  lucky_number: daily.lucky_number ?? null,
                  lucky_food: daily.lucky_food ?? null,
                  mood: daily.mood ?? null,
                  recommend: (daily.recommend as string[] | null) ?? [],
                }
              : null
          }
          initialStamps={Number(userRow?.bread_stamps ?? 0)}
          initialGolden={Boolean(breadOpen?.is_golden)}
        />
      </div>

      {/* ════════ 이번 달 흐름 — 무료 3줄 요약 + 유료 상세 진입 ════════ */}
      <div className="mt-7">
        <MonthlyTeaser
          yearMonth={yearMonth}
          summary={monthlySummary}
          hasDetail={hasMonthlyDetail}
        />
      </div>

      {/* ════════ 오늘의 흐름 (일진 점수) ════════ */}
      <div className="mt-7">
        <TodayScoreHero name={profile.name} sajuInput={calendarInput} />
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
