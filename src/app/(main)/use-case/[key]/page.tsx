import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import {
  daewoonFortune,
  sewoonFortune,
  lifeEventMarkers,
  GRADE_COLOR,
} from '@/lib/saju/daewoon_fortune';
import { USE_CASES, isUseCaseKey } from '@/lib/saju/use_cases';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { isPersonaKey } from '@/lib/utils/persona-mode';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Card } from '@/components/ui/primitives';
import { UseCaseClient } from './UseCaseClient';
import type { InterpretationCategory } from '@/types/db';
import type { SajuInput } from '@/lib/saju/types';

// Cookie-aware (persona-mode) — RSC 캐시가 모드 변경 후에도 옛 콘텐츠를
// 들고있지 않게 매 요청마다 fresh render.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function UseCasePage({ params }: PageProps) {
  const { key } = await params;
  if (!isUseCaseKey(key)) notFound();
  const useCase = USE_CASES[key];

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('id,birth_date,birth_time,is_lunar,is_leap_month,gender,name')
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

  // Persona 모드 cookie
  const cookieStore = await cookies();
  const personaRaw = cookieStore.get('ggobuk_persona_mode')?.value ?? 'dosa';
  const persona: PersonaKey = isPersonaKey(personaRaw) ? personaRaw : 'dosa';

  // Primary 카테고리 + 캐시된 풀이 (이 모드 기준)
  const primaryCategory = useCase.categories[0];
  const { data: cachedInterp } = await supabase
    .from('interpretations')
    .select('content')
    .eq('saju_id', profile.id)
    .eq('category', primaryCategory)
    .eq('persona', persona)
    .maybeSingle();

  // 진행 중 대운 + 올해 세운 점수
  const currentYear = new Date().getFullYear();
  const currentDaewoon =
    saju.daewoon.find(
      (d) => currentYear >= d.startYear && currentYear <= d.startYear + 9,
    ) ?? null;
  // 모든 saju 도메인 호출을 defensive하게 래핑 — 라이브러리 범위 초과,
  // 손상된 사주 데이터 등으로 throw해도 페이지는 살아남게.
  let daewoonF: ReturnType<typeof daewoonFortune> | null = null;
  let sewoonF: ReturnType<typeof sewoonFortune> | null = null;
  let allMarkers: ReturnType<typeof lifeEventMarkers> = [];
  try {
    daewoonF = currentDaewoon ? daewoonFortune(saju, currentDaewoon) : null;
  } catch {}
  try {
    sewoonF = currentDaewoon
      ? sewoonFortune(saju, currentYear, currentDaewoon)
      : null;
  } catch {}
  try {
    allMarkers = lifeEventMarkers(saju);
  } catch {}
  const relatedMarkers = allMarkers
    .filter((m) => useCase.eventTypes.includes(m.type))
    .sort((a, b) => {
      const aFuture = a.year >= currentYear;
      const bFuture = b.year >= currentYear;
      if (aFuture && !bFuture) return -1;
      if (!aFuture && bFuture) return 1;
      return a.year - b.year;
    })
    .slice(0, 4);

  const categoryTitle =
    INTERPRETATION_CATEGORIES.find((c) => c.key === primaryCategory)?.title ??
    primaryCategory;

  const personaMeta = PERSONAS[persona];

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-xs font-black text-muted"
        >
          <ArrowLeft size={14} strokeWidth={3} />홈
        </Link>

        {/* Use case 헤더 */}
        <Card className={`mt-3 p-5 border ${useCase.cardClass}`}>
          <div className="flex items-start gap-3">
            <span className="text-5xl leading-none">{useCase.emoji}</span>
            <div className="min-w-0 flex-1 pr-24">
              <p className="text-[11px] font-extrabold text-muted">
                포커싱 풀이
              </p>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-navy">
                {useCase.title}
              </h1>
              <p className="mt-1 text-[13px] font-bold leading-relaxed text-navy/85">
                {useCase.question}
              </p>
            </div>
          </div>
        </Card>

        {/* 즉시 답하는 핵심 신호 — LLM 없이 사주 계산만으로 */}
        {(daewoonF || sewoonF || relatedMarkers.length > 0) && (
          <Card className="mt-4 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-mint-dark">
                  내 사주가 가리키는 단서
                </p>
                <h2 className="text-base font-black text-navy">
                  지금 이 영역의 흐름
                </h2>
              </div>
            </div>

            {/* 현재 대운/세운 점수 */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {daewoonF && (
                <div className="rounded-2xl bg-ivory/70 p-3">
                  <p className="text-[10px] font-extrabold text-muted">
                    진행 중 대운
                  </p>
                  <p className="mt-0.5 text-sm font-black text-navy">
                    <span className="font-hanja">
                      {daewoonF.pillar.ganHanja}
                      {daewoonF.pillar.jiHanja}
                    </span>{' '}
                    · {daewoonF.sipsung}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-muted">
                    {daewoonF.startAge}–{daewoonF.startAge + 9}세
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${GRADE_COLOR[daewoonF.grade].dot}`}
                    />
                    <span className="text-[12px] font-black text-navy">
                      {daewoonF.grade} · {daewoonF.score}점
                    </span>
                  </div>
                </div>
              )}
              {sewoonF && (
                <div className="rounded-2xl bg-ivory/70 p-3">
                  <p className="text-[10px] font-extrabold text-muted">
                    올해 세운 ({sewoonF.year})
                  </p>
                  <p className="mt-0.5 text-sm font-black text-navy">
                    <span className="font-hanja">
                      {sewoonF.pillar.ganHanja}
                      {sewoonF.pillar.jiHanja}
                    </span>{' '}
                    · {sewoonF.sipsung}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-muted">
                    {sewoonF.note}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${GRADE_COLOR[sewoonF.grade].dot}`}
                    />
                    <span className="text-[12px] font-black text-navy">
                      {sewoonF.grade} · {sewoonF.score}점
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 관련 이벤트 마커 */}
            {relatedMarkers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-extrabold text-muted">
                  이 영역의 시점 단서
                </p>
                {relatedMarkers.map((m) => {
                  const isPast = m.year < currentYear;
                  const isThisYear = m.year === currentYear;
                  return (
                    <div
                      key={`${m.year}-${m.type}-${m.label}`}
                      className={`flex items-start gap-2 rounded-2xl border p-2.5 ${
                        isThisYear
                          ? 'border-navy/30 bg-navy/5'
                          : isPast
                            ? 'border-navy/8 bg-ivory/55 opacity-80'
                            : 'border-navy/10 bg-ivory/85'
                      }`}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-navy text-white px-1.5 py-0.5 text-[10px] font-black tabular-nums">
                            {m.year}
                          </span>
                          <span className="text-[11px] font-extrabold text-muted">
                            {m.age}세
                          </span>
                          {isThisYear && (
                            <span className="rounded-full bg-mint/30 px-1.5 py-0.5 text-[10px] font-black text-[#16706B]">
                              올해
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[13px] font-black text-navy">
                          {m.label}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold leading-snug text-muted">
                          {m.reason}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* AI 풀이 — 클라이언트에서 생성/표시 */}
        <UseCaseClient
          useCase={useCase}
          primaryCategory={primaryCategory}
          primaryCategoryTitle={categoryTitle}
          cachedContent={cachedInterp?.content ?? ''}
          personaName={personaMeta.displayName}
          personaKey={persona}
          ownerName={profile.name}
        />

        {/* 더 깊게 보고 싶으면 전체 카테고리 */}
        <Card className="mt-4 p-4 bg-white/70">
          <p className="text-[11px] font-extrabold text-muted">
            더 깊게 보고 싶다면
          </p>
          <p className="mt-1 text-[12px] font-bold leading-relaxed text-navy">
            이 풀이의 추천 카테고리:{' '}
            {useCase.categories
              .map(
                (c) =>
                  INTERPRETATION_CATEGORIES.find((cat) => cat.key === c)
                    ?.title ?? c,
              )
              .join(', ')}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {useCase.categories.map((catKey) => {
              const meta = INTERPRETATION_CATEGORIES.find(
                (c) => c.key === catKey,
              );
              if (!meta) return null;
              return (
                <Link
                  key={catKey}
                  href={`/shell/${catKey}`}
                  prefetch
                  className="flex items-center justify-between rounded-2xl border border-navy/10 bg-white p-3 active:scale-[0.99] transition"
                >
                  <span>
                    <span className="block text-[13px] font-black text-navy">
                      {meta.title} 정밀 리포트
                    </span>
                    <span className="mt-0.5 block text-[11px] font-bold text-muted">
                      12 카테고리의 정식 풀이
                    </span>
                  </span>
                  <span className="text-muted">→</span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* 현재 페르소나 안내 */}
        <p className="mt-4 text-center text-[10px] font-bold text-muted">
          현재 {personaMeta.displayName} 모드로 풀이 중. 모드 변경은 우상단
          버튼.
        </p>

        <div className="mt-4 flex justify-center opacity-70">
          <KkobukSprite variant="persona-kkobuk" size="sm" ariaLabel="꼬북이" />
        </div>
      </div>
    </main>
  );
}
