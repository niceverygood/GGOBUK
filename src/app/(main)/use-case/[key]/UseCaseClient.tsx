'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Card, ButtonPrimary } from '@/components/ui/primitives';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { AnalysisLoader } from '@/components/ui/AnalysisLoader';
import {
  PERSONA_LOADER_STEPS,
  loaderEyebrowFor,
} from '@/lib/llm/persona_loader_steps';
import {
  completeGeneration,
  startGeneration,
} from '@/lib/utils/generation-lock';
import { readPersonaMode } from '@/lib/utils/persona-mode';
import { interpretationCostFor } from '@/lib/credits';
import { isNativeIOS } from '@/lib/utils/platform';
import type { UseCase } from '@/lib/saju/use_cases';
import type { PersonaKey } from '@/lib/llm/personas';
import type { InterpretationCategory } from '@/types/db';

export function UseCaseClient({
  useCase,
  primaryCategory,
  primaryCategoryTitle,
  cachedContent,
  personaName,
  personaKey,
  ownerName,
}: {
  useCase: UseCase;
  primaryCategory: InterpretationCategory;
  primaryCategoryTitle: string;
  cachedContent: string;
  personaName: string;
  personaKey: PersonaKey;
  ownerName: string | null;
}) {
  const router = useRouter();
  const [content, setContent] = useState(cachedContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 페르소나별 가격 차등 — UseCase 페이지는 서버에서 cookie로 결정된
  // personaKey가 그대로 prop으로 내려오므로 그걸 기준으로 표시.
  const cost = interpretationCostFor(personaKey);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError('');
    const persona = readPersonaMode();
    const lockId = `usecase:${useCase.key}`;
    startGeneration(
      lockId,
      `포커스 풀이 — ${useCase.title}`,
      `/use-case/${useCase.key}`,
    );
    try {
      const res = await fetch('/api/interpretations/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: primaryCategory,
          focus: useCase.focus,
          persona,
          // 기존 본문 있으면 supplement append, 없으면 fresh
          appendTo: content || undefined,
          title: `${useCase.title} 포커스`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402) {
          setError('꼬북알이 부족해요. 충전 후 다시 시도해주세요.');
          completeGeneration(lockId, 'error');
          setLoading(false);
          return;
        }
        if (res.status === 429) {
          setError('잠시 후 다시 시도해주세요.');
          completeGeneration(lockId, 'error');
          setLoading(false);
          return;
        }
        throw new Error(data.error ?? 'gen_failed');
      }
      setContent(typeof data.content === 'string' ? data.content : '');
      // Use case 페이지가 cookie-aware라 router.refresh로 cached 갱신 반영
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '풀이 생성에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
      completeGeneration(lockId, 'error');
      setLoading(false);
      return;
    }
    completeGeneration(lockId, 'success');
    setLoading(false);
  }

  return (
    <Card className="mt-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-extrabold text-muted">
            {personaName}의 포커스 풀이
          </p>
          <h2 className="text-base font-black text-navy">
            {useCase.title} 정밀 풀이
          </h2>
          <p className="mt-0.5 text-[11px] font-bold text-muted">
            관련 카테고리: {primaryCategoryTitle}
            {ownerName ? ` · ${ownerName}님 기준` : ''}
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-4">
          <AnalysisLoader
            steps={PERSONA_LOADER_STEPS[personaKey]}
            expectedMs={32_000}
            eyebrow={loaderEyebrowFor(personaKey)}
          />
        </div>
      )}

      {!loading && content && (
        <div className="mt-4">
          <InterpretationBody text={content} />
        </div>
      )}

      {!loading && !content && (
        <div className="mt-4 rounded-2xl bg-ivory/70 p-4">
          <p className="text-[13px] font-black text-navy">
            아직 이 주제로 받은 풀이가 없어요
          </p>
          <p className="mt-1 text-[12px] font-bold leading-relaxed text-muted">
            "{useCase.question}"에 답하는 깊은 풀이를{' '}
            {cost}꼬북알로 받아보세요. 진행 중 대운과 올해 흐름까지 함께 짚어
            줍니다.
          </p>
        </div>
      )}

      {!loading && (
        <div className="mt-4 space-y-2">
          <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Sparkles size={16} strokeWidth={2.6} />
              {content
                ? `${cost}꼬북알로 더 깊게 풀이 추가`
                : `${cost}꼬북알로 ${useCase.title} 풀이 받기`}
            </span>
          </ButtonPrimary>
          {error && (
            <p className="text-center text-[11px] font-bold text-red">
              {error}
              {error.includes('부족') && !isNativeIOS() && (
                <>
                  {' '}
                  <a
                    href="/more/pro"
                    className="underline underline-offset-4"
                  >
                    충전하기
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      )}
      {/* personaKey reserved for future per-persona analytics */}
      <span hidden data-persona={personaKey} />
    </Card>
  );
}
