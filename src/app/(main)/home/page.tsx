import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  CalendarCheck,
  ChevronRight,
  Library,
  UsersRound,
  Waypoints,
} from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Card } from '@/components/ui/primitives';
import { MyIljuHero } from '@/components/home/MyIljuHero';
import { TodayScoreHero } from '@/components/home/TodayScoreHero';
import { WelcomeBonusCard } from '@/components/home/WelcomeBonusCard';
import { BetaFreeBadge } from '@/components/home/BetaFreeBadge';
import { todayKstIso } from '@/lib/utils/date';
import { USE_CASES, USE_CASE_ORDER } from '@/lib/saju/use_cases';
import type { Palja, SajuInput } from '@/lib/saju/types';

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

  const TOOLS = [
    {
      href: '/timeline',
      title: '대운 타임라인',
      subtitle: '10년 단위 큰 흐름',
      icon: Waypoints,
    },
    {
      href: '/more/auspicious',
      title: '택일 찾기',
      subtitle: '이사 · 계약 · 시작일',
      icon: CalendarCheck,
    },
    {
      href: '/people',
      title: '사람 관리',
      subtitle: `인원 ${profileCount ?? 1} · 풀이 ${interpretationCount ?? 0} · 인연 ${relationCount ?? 0}`,
      icon: UsersRound,
    },
    {
      href: '/library',
      title: '보관함',
      subtitle: '받은 풀이 다시 보기',
      icon: Library,
    },
  ];

  return (
    <main className="relative px-5 pb-32 pt-8">
      {/* 인사 — 우상단 PersonaModeChip(fixed)을 피하려 pr-28 유지 */}
      <div className="pr-28">
        <p className="text-xs font-extrabold text-muted">오늘도 꼬북점 🐢</p>
        <h1 className="mt-0.5 text-lg font-black text-navy">
          {profile.name}님, 안녕하세요
        </h1>
      </div>

      {/* ════════ 오늘 점수 히어로 (단일 초점) ════════ */}
      <TodayScoreHero
        name={profile.name}
        sajuInput={calendarInput}
        sajuId={profile.id}
        oneLiner={daily?.one_liner ?? null}
        recommend={daily?.recommend ?? []}
      />

      <BetaFreeBadge />
      <WelcomeBonusCard />

      {/* ════════ 내 일주 (슬림) ════════ */}
      <SectionHead
        eyebrow="나의 사주"
        title="내 일주"
        right={{ href: '/shell', label: '사주 자세히' }}
      />
      <MyIljuHero
        compact
        name={profile.name}
        day={palja.day}
        birthDate={profile.birth_date}
        birthTime={profile.birth_time ?? null}
        isLunar={profile.is_lunar}
        gender={profile.gender}
      />

      {/* ════════ 포커스 풀이 ════════ */}
      <SectionHead
        eyebrow="이번 주 이 질문에 답받기"
        title="포커스 풀이"
        right={{ href: '/shell', label: '전체 12풀이' }}
      />
      <div className="grid grid-cols-2 gap-2.5">
        {USE_CASE_ORDER.map((key) => {
          const uc = USE_CASES[key];
          return (
            <Link
              key={key}
              href={`/use-case/${key}`}
              prefetch
              className={`min-h-[116px] rounded-3xl border p-3.5 transition active:scale-[0.99] ${uc.cardClass}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[28px] leading-none">{uc.emoji}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black ${uc.accentChipClass}`}
                >
                  포커스
                </span>
              </div>
              <p className="mt-2.5 text-[15px] font-black text-navy">
                {uc.title}
              </p>
              <p className="mt-1 text-[10px] font-bold leading-snug text-navy/65">
                {uc.question}
              </p>
            </Link>
          );
        })}
      </div>

      {/* ════════ 도구 (슬림) ════════ */}
      <SectionHead eyebrow="꼬북점 도구" title="더 보기" />
      <Card className="divide-y divide-navy/8 overflow-hidden p-0">
        {TOOLS.map(({ href, title, subtitle, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch
            className="flex items-center gap-3 px-4 py-3.5 transition active:bg-ivory"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ivory text-navy">
              <Icon size={19} strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-black text-navy">{title}</p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-muted">
                {subtitle}
              </p>
            </div>
            <ChevronRight size={18} strokeWidth={2.6} className="text-navy/30" />
          </Link>
        ))}
      </Card>

      {/* 꼬북이와 대화 — floating */}
      <Link
        href="/chat"
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center overflow-visible rounded-2xl bg-navy text-white shadow-[0_14px_26px_rgba(44,62,80,0.24)]"
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

/** 점신식 섹션 헤더 — 회색 eyebrow + 큰 볼드 타이틀 + 우측 링크. */
function SectionHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: { href: string; label: string };
}) {
  return (
    <div className="mb-2.5 mt-8 flex items-end justify-between">
      <div>
        <p className="text-[12px] font-extrabold text-muted">{eyebrow}</p>
        <h2 className="mt-0.5 text-[22px] font-black leading-tight text-navy">
          {title}
        </h2>
      </div>
      {right && (
        <Link
          href={right.href}
          prefetch
          className="shrink-0 text-[12px] font-black text-mint-dark"
        >
          {right.label} →
        </Link>
      )}
    </div>
  );
}
