'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { AnalysisLoader } from '@/components/ui/AnalysisLoader';
import { ButtonPrimary } from '@/components/ui/primitives';
import { CREDIT_COSTS, CREDIT_UNIT } from '@/lib/credits';
import { isNativeApp } from '@/lib/utils/platform';
import { track } from '@/lib/analytics/track';

const ANALYSIS_STEPS = [
  { at: 0, title: '원국 펼치는 중...', body: '연월일시 네 기둥을 다시 맞춰보고 있어요.' },
  { at: 0.18, title: '오행 온도 재는 중...', body: '강한 기운과 빈자리를 비교하는 중이에요.' },
  { at: 0.38, title: '반복 패턴 찾는 중...', body: '성향·관계·돈·일의 반복 패턴을 골라내고 있어요.' },
  { at: 0.6, title: '지금의 흐름 연결하는 중...', body: '올해와 앞으로의 큰 흐름을 이어 보고 있어요.' },
  { at: 0.82, title: '풀이 문장 다듬는 중...', body: '읽기 좋게 한 편으로 정리하고 있어요.' },
  { at: 0.95, title: '거의 다 됐어요...', body: '응답을 받는 대로 바로 보여드릴게요.' },
];

const EXPECTED_ANALYSIS_MS = 45_000;

type Status = 'idle' | 'loading' | 'error' | 'insufficient';

/**
 * 내 사주 전체 풀이 — 단일 문서 생성/표시 패널.
 * 캐시된 풀이가 있으면 바로 보여주고, 없으면 생성 버튼 하나만 노출한다.
 */
export function FullReadingPanel({
  initialContent,
  generatedLabel,
}: {
  initialContent: string;
  /** 서버에서 계산한 "n일 전 생성" 라벨 (클라이언트 시계 의존 제거). */
  generatedLabel: string | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<Status>('idle');
  const isFirst = content.length === 0;

  async function generate() {
    if (status === 'loading') return;
    setStatus('loading');
    track('reading_generate', { first: isFirst });
    try {
      const res = await fetch('/api/interpretations/regenerate', {
        method: 'POST',
      });
      if (res.status === 402) {
        setStatus('insufficient');
        track('paywall_view', { peak: 'reading', reason: 'needs_credit' });
        return;
      }
      if (!res.ok) throw new Error(`generate failed: ${res.status}`);
      const data = (await res.json()) as { content: string };
      setContent(data.content);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return (
      <AnalysisLoader
        steps={ANALYSIS_STEPS}
        expectedMs={EXPECTED_ANALYSIS_MS}
        eyebrow="꼬북이가 사주를 읽는 중"
      />
    );
  }

  if (isFirst) {
    return (
      <div className="text-center">
        <p className="text-sm font-black text-navy">
          내 사주 전체 풀이 받기
        </p>
        <p className="mx-auto mt-1.5 max-w-[260px] text-xs font-bold leading-relaxed text-muted">
          성격 · 강점 · 조심할 점 · 일과 돈 · 사랑 · 지금의 흐름까지, 꼬북이가
          한 편의 풀이로 정리해줘요.
        </p>
        <div className="mt-4">
          <ButtonPrimary tone="mint" onClick={generate}>
            전체 풀이 받기 · {CREDIT_COSTS.reading}
            {CREDIT_UNIT}
          </ButtonPrimary>
        </div>
        <StatusNotice status={status} />
      </div>
    );
  }

  return (
    <div>
      {generatedLabel && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-ivory px-2.5 py-1 text-[10.5px] font-extrabold text-muted">
          <span>🕐</span>
          <span>{generatedLabel}</span>
        </div>
      )}
      <InterpretationBody text={content} />
      <div className="mt-6 border-t border-navy/8 pt-4 text-center">
        <button
          onClick={generate}
          className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-ivory px-4 py-2 text-xs font-extrabold text-navy transition active:scale-[0.98]"
        >
          <RefreshCw size={13} strokeWidth={2.6} />
          다시 풀어보기 · {CREDIT_COSTS.reading}
          {CREDIT_UNIT}
        </button>
        <StatusNotice status={status} />
      </div>
    </div>
  );
}

function StatusNotice({ status }: { status: Status }) {
  if (status === 'insufficient') {
    return (
      <div className="mx-auto mt-3 max-w-[300px] rounded-xl border border-gold/40 bg-gold/25 p-3 text-xs font-bold text-navy">
        꼬북알이 부족해요.
        {!isNativeApp() && (
          <Link href="/store" className="ml-1.5 underline underline-offset-4">
            충전하러 가기
          </Link>
        )}
      </div>
    );
  }
  if (status === 'error') {
    return (
      <p className="mt-3 text-xs font-bold text-red">
        풀이를 만들지 못했어요. 잠깐 후 다시 시도해 주세요.
      </p>
    );
  }
  return null;
}

