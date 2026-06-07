import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { MyIljuHero } from '@/components/home/MyIljuHero';
import { TodayScoreHero } from '@/components/home/TodayScoreHero';
import { WelcomeBonusCard } from '@/components/home/WelcomeBonusCard';
import { BetaFreeBadge } from '@/components/home/BetaFreeBadge';
import { todayKstIso } from '@/lib/utils/date';
import type { Palja, SajuInput } from '@/lib/saju/types';

/**
 * 홈 = "나" 중심 단일 초점.
 * - 핵심 하이라이트: 내 일주 정체성(평생 불변의 나) + 오늘의 나(일진 점수).
 * - 실제 사주(8글자·오행·12풀이)는 사주 탭(/shell)에서 본다 → 홈엔 진입 링크 1개만.
 * - 이전의 포커스-풀이 그리드·도구 리스트는 제거해 화면을 비웠다(각각 사주탭·하단탭·더보기에 존재).
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
      {/* 인사 — 우상단 PersonaModeChip(fixed)을 피하려 pr-28 유지 */}
      <div className="pr-28">
        <p className="text-xs font-extrabold text-muted">오늘도 꼬북점 🐢</p>
        <h1 className="mt-0.5 text-lg font-black text-navy">
          {profile.name}님, 안녕하세요
        </h1>
      </div>

      {/* ════════ 나 — 내 일주 정체성 (홈의 단일 하이라이트) ════════ */}
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

      {/* 실제 사주(8글자·오행·12풀이)는 사주 탭에서 — 진입 링크 1개 */}
      <Link
        href="/shell"
        prefetch
        className="mt-3 flex items-center justify-between rounded-2xl border border-navy/10 bg-white px-4 py-3.5 transition active:scale-[0.99]"
      >
        <div className="min-w-0">
          <p className="text-[14px] font-black text-navy">내 사주 자세히 보기</p>
          <p className="mt-0.5 text-[11px] font-bold text-muted">
            사주 8글자 · 오행 · 12가지 풀이
          </p>
        </div>
        <ArrowRight size={18} strokeWidth={2.6} className="shrink-0 text-mint-dark" />
      </Link>

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

      <WelcomeBonusCard />
      <BetaFreeBadge />
    </main>
  );
}
