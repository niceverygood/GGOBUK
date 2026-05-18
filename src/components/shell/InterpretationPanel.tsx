'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { ButtonPrimary } from '@/components/ui/primitives';
import { CREDIT_COSTS } from '@/lib/credits';
import type { InterpretationCategory } from '@/types/db';

const ANALYSIS_STEPS = [
  {
    at: 0,
    title: '원국 펼치는 중...',
    body: '연월일시 네 기둥을 다시 맞춰보고 있어요.',
  },
  {
    at: 0.14,
    title: '오행 온도 재는 중...',
    body: '목화토금수의 쏠림과 빈자리를 비교하는 중이에요.',
  },
  {
    at: 0.3,
    title: '십성 단서 모으는 중...',
    body: '성향, 관계, 돈, 일의 반복 패턴을 골라내고 있어요.',
  },
  {
    at: 0.48,
    title: '신살 포인트 표시하는 중...',
    body: '체감이 큰 사건성 단서를 조심스럽게 확인하고 있어요.',
  },
  {
    at: 0.66,
    title: '대운 흐름 연결하는 중...',
    body: '지금 시기와 앞으로의 큰 흐름을 이어 보고 있어요.',
  },
  {
    at: 0.82,
    title: '리포트 문장 다듬는 중...',
    body: '표, 체크포인트, 활용 처방까지 읽기 좋게 정리하고 있어요.',
  },
  {
    at: 0.95,
    title: '거의 다 됐어요...',
    body: '응답을 받는 대로 바로 리포트 화면에 꽂아둘게요.',
  },
];

const EXPECTED_ANALYSIS_MS = 48_000;

function errorMessage(code: string): string {
  if (code === 'llm_not_configured') return 'AI 키 설정이 아직 안 되어 있어요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  if (code === 'unauthorized') return '로그인이 필요해요.';
  if (code === 'insufficient_credits') return '크래딧이 부족해요.';
  return '해설을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

function loadingProgress(elapsedMs: number) {
  const raw = elapsedMs / EXPECTED_ANALYSIS_MS;
  if (raw >= 1) return 95;
  return Math.max(8, Math.round(raw * 92));
}

function loadingStepIndex(progress: number) {
  const ratio = progress / 100;
  let index = 0;
  for (let i = 0; i < ANALYSIS_STEPS.length; i += 1) {
    if (ratio >= ANALYSIS_STEPS[i].at) index = i;
  }
  return index;
}

function AnalysisLoadingIndicator({ elapsedMs }: { elapsedMs: number }) {
  const progress = loadingProgress(elapsedMs);
  const stepIndex = loadingStepIndex(progress);
  const step = ANALYSIS_STEPS[stepIndex];
  const secondsLeft = Math.max(
    0,
    Math.ceil((EXPECTED_ANALYSIS_MS - elapsedMs) / 1000),
  );

  return (
    <div
      className="overflow-hidden rounded-3xl border border-mint/35 bg-gradient-to-br from-mint/18 via-white to-gold/18 p-4 shadow-[0_12px_28px_rgba(44,62,80,0.08)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy text-white">
          <Sparkles size={20} strokeWidth={2.5} />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gold shadow-[0_0_0_4px_rgba(244,208,63,0.22)] animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-mint-dark">
            AI 상세 분석 업데이트 중
          </p>
          <p className="mt-1 text-base font-black text-navy">{step.title}</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            {step.body}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-navy/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint to-gold transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-black text-muted">
        <span>예상 {Math.round(EXPECTED_ANALYSIS_MS / 1000)}초 안팎</span>
        <span>
          {progress >= 95 ? '마지막 응답 대기' : `약 ${secondsLeft}초 남음`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ANALYSIS_STEPS.slice(0, -1).map((item, index) => {
          const active = index <= stepIndex;
          const current = index === stepIndex;
          return (
            <div
              key={item.title}
              className={`rounded-xl px-2 py-1.5 text-center text-[10px] font-black transition ${
                current
                  ? 'bg-navy text-white'
                  : active
                    ? 'bg-mint/18 text-navy'
                    : 'bg-white/70 text-muted/70'
              }`}
            >
              {item.title.replace('...', '')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InterpretationPanel({
  category,
  initialContent,
}: {
  category: InterpretationCategory;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState('');
  const isRichReport =
    content.includes('##') || content.includes('| 사주 근거 |');

  useEffect(() => {
    if (!loading) return;

    const timer = window.setInterval(() => {
      setElapsedMs((current) => current + 500);
    }, 500);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function generate() {
    setLoading(true);
    setElapsedMs(0);
    setError('');
    try {
      const res = await fetch('/api/interpretations/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'unknown',
        );
      setContent(typeof data.content === 'string' ? data.content : '');
    } catch (e) {
      setError(errorMessage(e instanceof Error ? e.message : 'unknown'));
    } finally {
      setLoading(false);
    }
  }

  if (!content) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-black text-navy">
            AI 정밀 리포트가 아직 없어
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            크래딧을 사용하면 원국 근거, 표, 체감 체크포인트까지 묶어서 깊게
            풀어줄게.
          </p>
        </div>
        {loading && <AnalysisLoadingIndicator elapsedMs={elapsedMs} />}
        <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
          {loading
            ? ANALYSIS_STEPS[loadingStepIndex(loadingProgress(elapsedMs))].title
            : `크래딧 ${CREDIT_COSTS.interpretation}개로 해설 생성`}
        </ButtonPrimary>
        {error && (
          <p className="text-center text-xs font-bold text-red">
            {error}{' '}
            {error.includes('크래딧') && (
              <Link href="/more/pro" className="underline underline-offset-4">
                충전하기
              </Link>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {!isRichReport && (
        <div className="mb-4 rounded-2xl bg-gold/15 px-4 py-3">
          <p className="text-xs font-black text-[#6B5A24]">
            새 정밀 리포트 형식 사용 가능
          </p>
          <p className="mt-1 text-[12px] font-bold leading-relaxed text-muted">
            다시 생성하면 판독 근거표와 체감 체크포인트가 포함된 새 형식으로
            정리돼.
          </p>
        </div>
      )}
      <InterpretationBody text={content} />
      <div className="mt-5 space-y-3">
        {loading && <AnalysisLoadingIndicator elapsedMs={elapsedMs} />}
        <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
          {loading
            ? ANALYSIS_STEPS[loadingStepIndex(loadingProgress(elapsedMs))].title
            : `크래딧 ${CREDIT_COSTS.interpretation}개로 정밀 리포트 생성`}
        </ButtonPrimary>
        {error && (
          <p className="mt-2 text-center text-xs font-bold text-red">{error}</p>
        )}
      </div>
    </div>
  );
}
