'use client';

import Link from 'next/link';
import { useState } from 'react';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { ButtonPrimary } from '@/components/ui/primitives';
import { CREDIT_COSTS } from '@/lib/credits';
import type { InterpretationCategory } from '@/types/db';

function errorMessage(code: string): string {
  if (code === 'llm_not_configured') return 'AI 키 설정이 아직 안 되어 있어요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  if (code === 'unauthorized') return '로그인이 필요해요.';
  if (code === 'insufficient_credits') return '크래딧이 부족해요.';
  return '해설을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.';
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
  const [error, setError] = useState('');
  const isRichReport =
    content.includes('##') || content.includes('| 사주 근거 |');

  async function generate() {
    setLoading(true);
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
        <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
          {loading
            ? 'AI가 읽는 중...'
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
      <div className="mt-5">
        <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
          {loading
            ? 'AI가 다시 읽는 중...'
            : `크래딧 ${CREDIT_COSTS.interpretation}개로 정밀 리포트 생성`}
        </ButtonPrimary>
        {error && (
          <p className="mt-2 text-center text-xs font-bold text-red">{error}</p>
        )}
      </div>
    </div>
  );
}
