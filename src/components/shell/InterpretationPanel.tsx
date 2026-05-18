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
            AI 정식 해설이 아직 없어
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            크래딧을 사용하면 이 카테고리를 내 사주에 맞춰 깊게 풀어줄게.
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
      <InterpretationBody text={content} />
      <div className="mt-5">
        <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
          {loading
            ? 'AI가 다시 읽는 중...'
            : `크래딧 ${CREDIT_COSTS.interpretation}개로 다시 생성`}
        </ButtonPrimary>
        {error && (
          <p className="mt-2 text-center text-xs font-bold text-red">{error}</p>
        )}
      </div>
    </div>
  );
}
