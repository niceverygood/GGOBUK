'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, Card } from '@/components/ui/primitives';
import { logger } from '@/lib/utils/logger';
import { computePreview, loadPreviewInput } from '@/lib/saju/preview';
import type { SajuResult } from '@/lib/saju/types';

export default function PreviewResultPage() {
  const router = useRouter();
  const [name, setName] = useState<string>('테스트');
  const [saju, setSaju] = useState<SajuResult | null>(null);

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
      } catch (e) {
        logger.error('preview', 'saju calc failed', { error: e instanceof Error ? e.message : String(e) });
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

        {/* 가입하면 받는 것 — 전체 풀이 + 꼬북이 채팅 */}
        <section className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-navy">가입하면 이렇게 풀려요</p>
            <Badge tone="gold">로그인 후 이용</Badge>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-3xl bg-white border border-navy/10 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)]">
              <span className="text-2xl leading-none">📜</span>
              <div className="min-w-0 flex-1">
                <h4 className="text-[15px] font-black text-navy">
                  내 사주 전체 풀이
                </h4>
                <p className="mt-0.5 text-[11px] font-bold text-muted leading-relaxed">
                  성격 · 강점 · 조심할 점 · 일과 돈 · 사랑 · 지금의 흐름까지 한
                  편의 리포트로.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-3xl bg-white border border-navy/10 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)]">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-mint/20 flex items-center justify-center overflow-hidden">
                <KkobukAvatar size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[15px] font-black text-navy">
                  꼬북이랑 대화
                </h4>
                <p className="mt-0.5 text-[11px] font-bold text-muted leading-relaxed">
                  내 사주를 아는 꼬북이에게 연애 · 일 · 돈, 뭐든 바로 물어보기.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-3xl bg-white border border-navy/10 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)]">
              <span className="text-2xl leading-none">🌅</span>
              <div className="min-w-0 flex-1">
                <h4 className="text-[15px] font-black text-navy">
                  매일 아침 오늘의 운세
                </h4>
                <p className="mt-0.5 text-[11px] font-bold text-muted leading-relaxed">
                  내 사주 기준으로 매일 바뀌는 오늘의 흐름과 한 줄 조언.
                </p>
              </div>
            </div>
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
