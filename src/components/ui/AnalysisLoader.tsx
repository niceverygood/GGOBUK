'use client';

import { useEffect, useState } from 'react';
import { KkobukLoadingSprite } from '@/components/kkobuk/KkobukLoadingSprite';

export interface AnalysisStep {
  /** 0–1 ratio at which this step starts being the current step */
  at: number;
  title: string;
  body: string;
}

interface Props {
  steps: AnalysisStep[];
  /** Expected total duration in ms — used to map elapsed time to progress (caps at 95%) */
  expectedMs: number;
  /** Optional eyebrow line above the title */
  eyebrow?: string;
  /** If true, the loader stops ticking (e.g. when request resolves but you still want to show 95% momentarily) */
  paused?: boolean;
  /** If provided, this value is used instead of the loader's internal clock — caller controls the tick */
  elapsedMs?: number;
  className?: string;
}

function progressOf(elapsedMs: number, expectedMs: number): number {
  const raw = elapsedMs / expectedMs;
  if (raw >= 1) return 95;
  return Math.max(8, Math.round(raw * 92));
}

function stepIndexOf(progress: number, steps: AnalysisStep[]): number {
  const ratio = progress / 100;
  let index = 0;
  for (let i = 0; i < steps.length; i += 1) {
    if (ratio >= steps[i].at) index = i;
  }
  return index;
}

/**
 * Stepped AI analysis loader with rotating "OOO하는 중..." text + visible filling gauge.
 *
 * Use whenever an LLM call is in flight on the client and you want to keep
 * the user engaged for ~10–60s. The progress bar fills toward 95% so it
 * never visually "finishes" before the request actually returns.
 */
export function AnalysisLoader({
  steps,
  expectedMs,
  eyebrow = 'AI 분석 업데이트 중',
  paused,
  elapsedMs: externalMs,
  className,
}: Props) {
  const [internalMs, setInternalMs] = useState(0);
  const useExternal = typeof externalMs === 'number';

  useEffect(() => {
    if (useExternal || paused) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setInternalMs(Date.now() - startedAt);
    }, 200);
    return () => window.clearInterval(id);
  }, [paused, useExternal]);

  const elapsedMs = useExternal ? (externalMs as number) : internalMs;
  const progress = progressOf(elapsedMs, expectedMs);
  const step = steps[stepIndexOf(progress, steps)] ?? steps[0];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-3xl border border-mint/35 bg-gradient-to-br from-mint/14 via-white to-gold/14 p-4 shadow-[0_12px_28px_rgba(44,62,80,0.08)] ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-navy text-white shadow-inner shadow-black/10">
          <KkobukLoadingSprite size={50} />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gold shadow-[0_0_0_4px_rgba(244,208,63,0.22)] animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-mint-dark">{eyebrow}</p>
          <p className="mt-1 text-base font-black text-navy">{step.title}</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            {step.body}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-navy tabular-nums"
          aria-label={`진행률 ${progress}%`}
        >
          {progress}%
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-navy/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint via-mint-dark to-gold transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between">
        {steps.map((s, i) => {
          const reached = progress / 100 >= s.at;
          return (
            <span
              key={s.title}
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                reached ? 'bg-mint-dark' : 'bg-navy/15'
              }`}
              title={`Step ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
