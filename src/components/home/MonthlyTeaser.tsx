'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarRange } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { CREDIT_COSTS, CREDIT_UNIT } from '@/lib/credits';
import { formatYearMonthLabel } from '@/lib/utils/date';
// 순수 파서만 import — lib/llm/monthly 를 직접 참조하면 LLM 클라이언트가 번들에 딸려온다.
import { parseMonthlySummary } from '@/domain/monthly/summary';
import { track } from '@/lib/analytics/track';

interface Props {
  /** KST 기준 'YYYY-MM' */
  yearMonth: string;
  /** 무료 3줄 요약 (없으면 생성 CTA 노출) */
  summary: string | null;
  /** 이번 달 상세를 이미 구매했는지 */
  hasDetail: boolean;
}

type Status = 'idle' | 'loading' | 'error';

/**
 * 이번 달 흐름 — 홈의 월별 사주풀이 티저.
 *
 * 무료 3줄 요약은 자동 생성(과금 없음)하고, 상세는 /monthly 에서 유료로 연다.
 * 요약과 상세는 같은 내용을 자르는 관계가 아니라 역할이 다르다 (lib/llm/monthly.ts 참조).
 */
export function MonthlyTeaser({ yearMonth, summary, hasDetail }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const label = formatYearMonthLabel(yearMonth);

  async function loadSummary() {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'summary', yearMonth }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  const parsed = summary ? parseMonthlySummary(summary) : null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <CalendarRange size={16} strokeWidth={2.6} className="text-mint-dark" />
        <p className="text-[12px] font-extrabold text-muted">이번 달 흐름</p>
      </div>
      <h2 className="mt-0.5 text-[20px] font-black leading-tight text-navy">
        {label}은 어떤 달일까
      </h2>

      {parsed ? (
        <div className="mt-4 space-y-2">
          <SummaryLine tone="flow" label="흐름" text={parsed.flow} />
          <SummaryLine tone="good" label="좋은 기운" text={parsed.good} />
          <SummaryLine tone="watch" label="조심" text={parsed.watch} />
        </div>
      ) : (
        <div className="mt-4">
          <button
            onClick={loadSummary}
            disabled={status === 'loading'}
            className="w-full rounded-2xl bg-ivory py-3 text-[14px] font-black text-navy transition active:scale-[0.99] disabled:opacity-60"
          >
            {status === 'loading'
              ? `${label} 흐름 읽는 중...`
              : `${label} 흐름 무료로 보기`}
          </button>
          {status === 'error' && (
            <p className="mt-2 text-center text-xs font-bold text-red">
              불러오지 못했어. 잠깐 후 다시 시도해줘.
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => {
          track('paywall_view', { peak: 'monthly' });
          router.push(`/monthly?ym=${yearMonth}`);
        }}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-navy/10 bg-white px-4 py-3.5 text-left transition active:scale-[0.99]"
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-black text-navy">
            {hasDetail ? `${label} 상세 풀이 보기` : `${label} 상세 풀이 받기`}
          </span>
          <span className="mt-0.5 block text-[11px] font-bold text-muted">
            {hasDetail
              ? '구매한 풀이 · 언제든 다시 읽기'
              : `분야별 흐름과 시기까지 · ${CREDIT_COSTS.monthly}${CREDIT_UNIT}`}
          </span>
        </span>
        <ArrowRight size={18} strokeWidth={2.6} className="shrink-0 text-mint-dark" />
      </button>
    </Card>
  );
}

const TONE: Record<string, { chip: string; text: string }> = {
  flow: { chip: 'bg-mint/20 text-[#16706B]', text: 'text-navy' },
  good: { chip: 'bg-gold/25 text-[#7C5A0E]', text: 'text-navy' },
  watch: { chip: 'bg-red/12 text-red', text: 'text-navy' },
};

function SummaryLine({
  tone,
  label,
  text,
}: {
  tone: keyof typeof TONE;
  label: string;
  text: string;
}) {
  if (!text) return null;
  const t = TONE[tone];
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-ivory px-3.5 py-2.5">
      <span
        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${t.chip}`}
      >
        {label}
      </span>
      <p className={`text-[13px] font-bold leading-snug ${t.text}`}>{text}</p>
    </div>
  );
}
