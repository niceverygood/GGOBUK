'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { LifeRoad } from '@/components/timeline/LifeRoad';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, Card } from '@/components/ui/primitives';
import { PartnerCompare } from '@/components/preview/PartnerCompare';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { computePreview, loadPreviewInput } from '@/lib/saju/preview';
import type { DaewoonPeriod, SajuResult } from '@/lib/saju/types';

const CATEGORY_ICONS: Record<string, string> = {
  overview: '📜',
  ohaeng: '☯',
  ilju: '🪞',
  strength: '✨',
  weakness: '🌿',
  personality: '🧠',
  career: '💼',
  wealth: '💰',
  love: '💕',
  family: '🏡',
  friends: '🤝',
  direction: '🧭',
};

const CATEGORY_BLURB: Record<string, string> = {
  overview: '내 등껍질 전체 흐름',
  ohaeng: '강한 기운과 부족한 기운',
  ilju: '본질을 보여주는 한 칸',
  strength: '타고난 세 가지 강점',
  weakness: '경계할 약점과 처방',
  personality: '다정하지만 기준은 뚜렷',
  career: '말과 콘텐츠에 강점',
  wealth: '돈이 모이는 타이밍',
  love: '끌림과 안정감의 패턴',
  family: '책임감이 묶는 관계',
  friends: '나를 키우는 인연',
  direction: '동북 방향의 기운',
};

export default function PreviewResultPage() {
  const router = useRouter();
  const [name, setName] = useState<string>('테스트');
  const [saju, setSaju] = useState<SajuResult | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DaewoonPeriod | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadPreviewInput();
      if (!stored) {
        router.replace('/preview');
        return;
      }
      setName(stored.name);
      try {
        const result = computePreview(stored.input);
        setSaju(result);
        const currentYear = new Date().getFullYear();
        const curr = result.daewoon.find(
          (p) => currentYear >= p.startYear && currentYear <= p.startYear + 9,
        );
        setSelectedPeriod(curr ?? result.daewoon[0]);
      } catch (e) {
        console.error('saju calc failed', e);
        router.replace('/preview');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  if (!saju) {
    return (
      <main className="p-10 text-center text-sm font-bold opacity-60">
        계산 중...
      </main>
    );
  }

  const summary = [
    saju.palja.year,
    saju.palja.month,
    saju.palja.day,
    saju.palja.time,
  ]
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => `${p.ganHanja}${p.jiHanja}`)
    .join(' · ');
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-dvh w-full max-w-md mx-auto px-5 pt-8 pb-12 relative overflow-x-hidden">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-muted">
              미리보기 · 저장 안 됨
            </p>
            <h1 className="text-2xl font-black tracking-tight text-navy truncate">
              {name}의 등껍질
            </h1>
          </div>
          <Badge tone="mint" className="shrink-0 whitespace-nowrap">
            일간 {saju.palja.day.ganOhaeng}
          </Badge>
        </div>

        {/* 8 pillars dome */}
        <div className="mt-6 flex justify-center">
          <TortoiseShell palja={saju.palja} activePosition="일간" />
        </div>

        {/* Day master headline */}
        <Card className="mt-6 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-navy">
              일간 <span className="font-hanja">{saju.palja.day.ganHanja}</span>{' '}
              ({saju.palja.day.gan}
              {saju.palja.day.ji})
            </p>
            <span className="text-xs font-black text-[#F4D03F]">핵심</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#82786D]">
            8자: <span className="font-hanja">{summary}</span>
          </p>
        </Card>

        {/* Sipsung map */}
        <section className="mt-6 rounded-3xl bg-white border border-navy/10 shadow-[0_12px_30px_rgba(44,62,80,0.08)] p-5">
          <p className="text-sm font-black text-navy mb-3">십성</p>
          <div className="grid grid-cols-2 gap-2 text-sm font-bold">
            <Pair
              label={`연간 (${saju.palja.year.gan})`}
              value={saju.sipsung.yearGan}
            />
            <Pair
              label={`연지 (${saju.palja.year.ji})`}
              value={saju.sipsung.yearJi}
            />
            <Pair
              label={`월간 (${saju.palja.month.gan})`}
              value={saju.sipsung.monthGan}
            />
            <Pair
              label={`월지 (${saju.palja.month.ji})`}
              value={saju.sipsung.monthJi}
            />
            <Pair
              label={`일지 (${saju.palja.day.ji})`}
              value={saju.sipsung.dayJi}
            />
            {saju.palja.time && saju.sipsung.timeGan && (
              <Pair
                label={`시간 (${saju.palja.time.gan})`}
                value={saju.sipsung.timeGan}
              />
            )}
            {saju.palja.time && saju.sipsung.timeJi && (
              <Pair
                label={`시지 (${saju.palja.time.ji})`}
                value={saju.sipsung.timeJi}
              />
            )}
          </div>
        </section>

        {/* Sinsal */}
        {saju.sinsal.length > 0 && (
          <section className="mt-6 rounded-3xl bg-white border border-navy/10 shadow-[0_12px_30px_rgba(44,62,80,0.08)] p-5">
            <p className="text-sm font-black text-navy mb-3">주요 신살</p>
            <div className="space-y-2">
              {saju.sinsal.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-mint/15 text-navy text-xs font-extrabold shrink-0">
                    {s.name}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    <span className="text-navy/70 mr-1">{s.position}</span>
                    {s.description}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Daewoon timeline */}
        <section className="mt-6 rounded-3xl bg-white border border-navy/10 shadow-[0_12px_30px_rgba(44,62,80,0.08)] p-2">
          <p className="text-sm font-black text-navy mb-1 ml-3 mt-2">
            대운 타임라인
          </p>
          <LifeRoad
            periods={saju.daewoon}
            currentYear={currentYear}
            selectedStartYear={selectedPeriod?.startYear ?? null}
            onSelect={setSelectedPeriod}
          />
        </section>

        {selectedPeriod && (
          <Card className="mt-4 p-4">
            <p className="text-sm font-black text-navy">
              {selectedPeriod.startYear}–{selectedPeriod.startYear + 9} ·{' '}
              <span className="font-hanja">
                {selectedPeriod.pillar.ganHanja}
                {selectedPeriod.pillar.jiHanja}
              </span>{' '}
              ({selectedPeriod.sipsung})
            </p>
            <p className="mt-1 text-sm font-semibold text-[#82786D]">
              {selectedPeriod.startAge}세부터 {selectedPeriod.startAge + 9}
              세까지의 큰 기운. 일간 {saju.ilgan}을 기준으로{' '}
              {selectedPeriod.sipsung}이 강하게 작용해.
            </p>
          </Card>
        )}

        <PartnerCompare selfSaju={saju} selfName={name} />

        {/* 12 categories — preview only, no LLM call */}
        <section className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-navy">12가지 등껍질 해설</p>
            <Badge tone="gold">로그인 후 풀이 가능</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {INTERPRETATION_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="min-h-[110px] p-3.5 rounded-3xl bg-white border border-navy/10 shadow-[0_9px_22px_rgba(44,62,80,0.06)]"
              >
                <div className="text-2xl leading-none">
                  {CATEGORY_ICONS[cat.key] ?? '·'}
                </div>
                <h4 className="mt-2 text-[15px] font-black text-navy">
                  {cat.title}
                </h4>
                <p className="mt-0.5 text-[11px] font-bold text-muted leading-tight">
                  {CATEGORY_BLURB[cat.key]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Persona tour link */}
        <section className="mt-7">
          <p className="text-sm font-black text-navy mb-3">꼬북이 페르소나</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(['kkobuk', 'dosa', 'mudang', 'bosal'] as const).map((p) => (
              <div
                key={p}
                className="rounded-2xl bg-white border border-navy/10 p-1.5 flex flex-col items-center min-w-0"
              >
                <div className="w-12 h-12 rounded-xl bg-mint/20 flex items-center justify-center overflow-hidden">
                  <KkobukAvatar variant={p} size="sm" />
                </div>
                <span className="text-[10px] font-extrabold text-navy mt-1 truncate w-full text-center">
                  {p === 'kkobuk'
                    ? '꼬북이'
                    : p === 'dosa'
                      ? '꼬북도사'
                      : p === 'mudang'
                        ? '꼬북무당'
                        : '꼬북보살'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex gap-2">
          <Link
            href="/preview"
            className="flex-1 text-center rounded-2xl bg-white border border-navy/10 py-3 text-sm font-extrabold text-navy"
          >
            다른 사주 넣어보기
          </Link>
          <Link
            href="/login"
            className="flex-1 text-center rounded-2xl bg-navy text-white py-3 text-sm font-extrabold"
          >
            저장하려면 로그인
          </Link>
        </div>
      </div>
    </main>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-ivory/60 border border-navy/5 px-3 py-2">
      <span className="text-xs font-bold text-muted">{label}</span>
      <span className="text-sm font-black text-navy">{value}</span>
    </div>
  );
}
