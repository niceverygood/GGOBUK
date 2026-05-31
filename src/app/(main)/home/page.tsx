import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  CalendarCheck,
  Sparkles,
  UsersRound,
  Waypoints,
} from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Badge, Card } from '@/components/ui/primitives';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { EnsureDaily } from '@/components/home/EnsureDaily';
import { MyIljuHero } from '@/components/home/MyIljuHero';
import { TodayInsight } from '@/components/home/TodayInsight';
import { WeekStrip } from '@/components/home/WeekStrip';
import { WelcomeBonusCard } from '@/components/home/WelcomeBonusCard';
import { PremiumFeaturesPromo } from '@/components/home/PremiumFeaturesPromo';
import { SeasonalUpdateBanner } from '@/components/home/SeasonalUpdateBanner';
import { BetaFreeBadge } from '@/components/home/BetaFreeBadge';
import { todayKstIso, formatKoreanDate } from '@/lib/utils/date';
import { calculatePalja } from '@/lib/saju/palja';
import { USE_CASES, USE_CASE_ORDER } from '@/lib/saju/use_cases';
import type { Palja, SajuInput } from '@/lib/saju/types';

const WEEKDAY = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
];

function rough길운(daily: { mood: string | null } | null): number {
  if (!daily) return 60;
  switch (daily.mood) {
    case 'happy':
      return 88;
    case 'excited':
      return 84;
    case 'thinking':
    case 'focused':
      return 78;
    case 'surprised':
      return 74;
    case 'relaxed':
    case 'calm':
      return 70;
    case 'worried':
    case 'cautious':
      return 55;
    default:
      return 65;
  }
}

// 하단 탭(홈·등껍질·채팅·인연·보관함)과 겹치지 않는 진입점만 남긴다.
// 등껍질·인연·채팅·보관함은 BottomNav에 상시 노출되므로 카드에서 제외.
const FEATURE_CARDS = [
  {
    href: '/people',
    title: '사람 관리',
    subtitle: '내 사주·인연을 한 화면에서',
    badge: '허브',
    icon: UsersRound,
    className: 'bg-gradient-to-br from-mint/25 via-white to-gold/15',
  },
  {
    href: '/timeline',
    title: '대운 타임라인',
    subtitle: '10년 단위 큰 흐름',
    badge: '흐름',
    icon: Waypoints,
    className: 'bg-gradient-to-br from-[#DCEBFF] to-white',
  },
  {
    href: '/more/auspicious',
    title: '택일 찾기',
    subtitle: '이사 · 계약 · 시작일 추천',
    badge: '길일',
    icon: CalendarCheck,
    className: 'bg-gradient-to-br from-gold/30 to-white',
  },
];

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

  // Today's 일진 for the header
  const ilji = calculatePalja({
    birthDate: today,
    isLunar: false,
    gender: 'M',
  }).day;
  const todayDate = new Date(today + 'T00:00:00');
  const weekday = WEEKDAY[todayDate.getDay()];

  const gilun = rough길운(daily);
  const palja = profile.palja as Palja;
  const calendarInput: SajuInput = {
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  };
  const { count: relationCount } = await supabase
    .from('relations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  const { count: profileCount } = await supabase
    .from('saju_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);
  const { count: interpretationCount } = await supabase
    .from('interpretations')
    .select('id', { count: 'exact', head: true })
    .eq('saju_id', profile.id);

  // SeasonalUpdateBanner — 가장 최근 풀이 시점만 필요
  const { data: latestInterp } = await supabase
    .from('interpretations')
    .select('generated_at')
    .eq('saju_id', profile.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        {/* 인사 — 우상단 PersonaModeChip(fixed)을 피하려 pr-28 유지 */}
        <div className="pr-28">
          <p className="text-xs font-extrabold text-muted">오늘도 꼬북점 🐢</p>
          <h1 className="mt-0.5 text-lg font-black text-navy">
            {profile.name}님, 안녕하세요
          </h1>
        </div>

        {/* 내 일주 — 평생 변하지 않는 '나' (맨 위 고정 노출, 오늘 일진과 구분) */}
        <MyIljuHero
          name={profile.name}
          day={palja.day}
          birthDate={profile.birth_date}
          birthTime={profile.birth_time ?? null}
          isLunar={profile.is_lunar}
          gender={profile.gender}
        />

        {/* 베타 무료 모드 안내 칩 — BETA_FREE_MODE=true 일 때만 노출 */}
        <BetaFreeBadge />

        {/* 신규 가입 보너스 환영 카드 — 보너스 미사용 + dismiss 안 한 유저만 노출 */}
        <WelcomeBonusCard />

        {/* 시즌/생일/풀이 재생성 시점 배너 — 조건부 자동 노출 */}
        <SeasonalUpdateBanner
          birthDate={profile.birth_date}
          latestInterpretationAt={latestInterp?.generated_at ?? null}
        />

        {/* ════════════════ 🌅 오늘 일진 ════════════════ */}
        <SectionDivider
          emoji="🌅"
          label="오늘 일진"
          right={<Badge tone="mint">길운 {gilun}</Badge>}
        />
        <p className="-mt-0.5 mb-1 text-xs font-extrabold text-muted">
          {formatKoreanDate(today)} {weekday} · 매일 바뀌는 그날의 기운
        </p>

        <TodayInsight
          ilji={ilji}
          myDay={palja.day}
          sajuInput={calendarInput}
          daily={daily ?? null}
        />

        <Card className="mt-3 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gold/30 text-navy mt-0.5">
              💬
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-muted">오늘의 한 줄</p>
              <p className="mt-0.5 text-base font-black text-navy leading-snug">
                {daily?.one_liner ? (
                  daily.one_liner
                ) : (
                  <>
                    오늘의 운세를 가져오는 중이야
                    <LoadingDots />
                  </>
                )}
              </p>
              {daily?.recommend && daily.recommend.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12px] font-bold text-[#3C4650]">
                  {daily.recommend.slice(0, 3).map((r: string) => (
                    <li key={r} className="leading-snug">
                      ✓ {r}
                    </li>
                  ))}
                  {(daily.avoid ?? []).slice(0, 2).map((a: string) => (
                    <li key={a} className="text-red leading-snug">
                      ! {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {!daily?.one_liner && <EnsureDaily sajuId={profile.id} />}
        </Card>

        {/* ════════════════ 📅 이번 주 ════════════════ */}
        <SectionDivider emoji="📅" label="이번 주" />

        <WeekStrip sajuInput={calendarInput} />

        {/* 한 달 전체 달력은 /calendar 로 분리 (메인 정리) */}
        <Link
          href="/calendar"
          prefetch
          className="mt-2 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3"
        >
          <span className="text-xs font-bold text-muted">
            이번 달 날짜별 일진 길흉이 궁금하면?
          </span>
          <span className="text-xs font-black text-mint-dark">운세 달력 →</span>
        </Link>

        {/* 🎯 Use-case 진입점 — 사용자가 실제로 가진 질문 6개로 좁혀 풀이 시작 */}
        <section className="mt-3">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-xs font-extrabold text-muted">
                🎯 이번 주 이 질문에 답받기
              </p>
              <h2 className="text-lg font-black text-navy">포커스 풀이</h2>
            </div>
            <Link
              href="/shell"
              className="text-xs font-black text-mint-dark"
            >
              전체 12풀이 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {USE_CASE_ORDER.map((key) => {
              const uc = USE_CASES[key];
              return (
                <Link
                  key={key}
                  href={`/use-case/${key}`}
                  prefetch
                  className={`min-h-[112px] rounded-3xl border p-3 shadow-[0_8px_18px_rgba(44,62,80,0.06)] transition active:scale-[0.99] ${uc.cardClass}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl leading-none">{uc.emoji}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black ${uc.accentChipClass}`}
                    >
                      포커스
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] font-black text-navy">
                    {uc.title}
                  </p>
                  <p className="mt-1 text-[10px] font-bold leading-snug text-navy/75">
                    {uc.question}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 부적·웹툰 promotion — high-margin 기능 home 노출 */}
        <PremiumFeaturesPromo />

        {/* ════════════════ 🎯 추가 풀이 ════════════════ */}
        <SectionDivider emoji="🎯" label="추가 풀이" />

        <section className="mt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-muted">
                꼬북점 운세 도구
              </p>
              <h2 className="text-lg font-black text-navy">
                필요한 풀이 바로 열기
              </h2>
            </div>
            <Link href="/library" className="text-xs font-black text-mint-dark">
              보관함 →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {FEATURE_CARDS.map(
              ({ href, title, subtitle, badge, icon: Icon, className }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  className={`min-h-[132px] rounded-3xl border border-navy/10 p-4 shadow-[0_10px_24px_rgba(44,62,80,0.06)] transition active:scale-[0.99] ${className}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/75 text-navy shadow-sm">
                      <Icon size={21} strokeWidth={2.4} />
                    </span>
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-navy">
                      {badge}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-black text-navy">{title}</p>
                  <p className="mt-1 text-[11px] font-bold leading-tight text-muted">
                    {subtitle}
                  </p>
                </Link>
              ),
            )}
          </div>
        </section>

        <Card className="mt-5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-mint/15 text-navy">
              <Sparkles size={21} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-navy">내 기록 요약</p>
              <p className="mt-0.5 text-xs font-bold text-muted">
                인원 {profileCount ?? 1}명 · 사주해설 {interpretationCount ?? 0}
                개 · 인연 {relationCount ?? 0}명
              </p>
            </div>
            <Link
              href="/people"
              prefetch
              className="shrink-0 rounded-full bg-navy px-3 py-2 text-xs font-black text-white"
            >
              <span className="inline-flex items-center gap-1">
                <UsersRound size={13} strokeWidth={3} />
                관리
              </span>
            </Link>
          </div>
        </Card>

        <Link
          href="/shell"
          className="mt-6 block w-full rounded-2xl bg-navy text-white text-center py-4 font-black shadow-[0_14px_26px_rgba(44,62,80,0.22)]"
        >
          내 등껍질 자세히 보기
        </Link>
      </div>

      <Link
        href="/chat"
        className="fixed right-5 bottom-24 w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center shadow-[0_14px_26px_rgba(44,62,80,0.24)] z-20 overflow-visible"
        aria-label="꼬북이와 대화"
      >
        <KkobukSprite
          variant="persona-kkobuk"
          size="xs"
          ariaLabel="꼬북이와 대화"
        />
      </Link>
    </main>
  );
}

/** 큰 시간 단위 섹션 헤더 (오늘 일진 / 이번 주 / 추가 풀이). */
function SectionDivider({
  emoji,
  label,
  right,
}: {
  emoji: string;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-2.5">
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-[18px] font-black tracking-tight text-navy">
        {label}
      </span>
      <span className="ml-2 flex-1 h-px bg-gradient-to-r from-navy/15 via-navy/8 to-transparent" />
      {right}
    </div>
  );
}
