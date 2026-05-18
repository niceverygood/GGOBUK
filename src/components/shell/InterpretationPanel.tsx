'use client';

import { useEffect, useRef, useState } from 'react';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { ButtonPrimary } from '@/components/ui/primitives';
import type { InterpretationCategory } from '@/types/db';

function errorMessage(code: string): string {
  if (code === 'llm_not_configured') return 'AI 키 설정이 아직 안 되어 있어요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  if (code === 'unauthorized') return '로그인이 필요해요.';
  return '해설을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function InterpretationPanel({
  category,
  initialContent,
}: {
  category: InterpretationCategory;
  initialContent: string;
}) {
  const requested = useRef(false);
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(!initialContent);
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

  useEffect(() => {
    if (content || requested.current) return;
    requested.current = true;
    void generate();
    // Auto-generate only once after this panel first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !content) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-black text-navy">AI 해설 생성 중</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            페이지는 먼저 열어뒀어. 해설만 안쪽에서 조용히 불러오는 중이야.
          </p>
        </div>
        <div className="space-y-2.5" aria-hidden="true">
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-navy/10" />
          <div className="h-4 w-full animate-pulse rounded-full bg-navy/10" />
          <div className="h-4 w-9/12 animate-pulse rounded-full bg-navy/10" />
          <div className="h-4 w-10/12 animate-pulse rounded-full bg-navy/10" />
        </div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="space-y-4 text-sm font-bold text-navy">
        <p>{error}</p>
        <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
          다시 시도하기
        </ButtonPrimary>
      </div>
    );
  }

  return (
    <div>
      <InterpretationBody text={content} />
      <div className="mt-5">
        <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
          {loading ? 'AI가 다시 읽는 중...' : 'AI 해설 다시 생성하기'}
        </ButtonPrimary>
        {error && (
          <p className="mt-2 text-center text-xs font-bold text-red">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
