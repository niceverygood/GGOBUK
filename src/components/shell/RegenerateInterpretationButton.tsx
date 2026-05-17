'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ButtonPrimary } from '@/components/ui/primitives';
import type { InterpretationCategory } from '@/types/db';

function errorMessage(code: string): string {
  if (code === 'llm_not_configured') return 'AI 키 설정이 아직 안 되어 있어요.';
  if (code === 'pro_only') return 'Pro 전용 해설이에요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  return '해설을 다시 생성하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function RegenerateInterpretationButton({
  category,
}: {
  category: InterpretationCategory;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function regenerate() {
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
      router.refresh();
    } catch (e) {
      setError(errorMessage(e instanceof Error ? e.message : 'unknown'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <ButtonPrimary tone="mint" onClick={regenerate} disabled={loading}>
        {loading ? 'AI가 깊게 다시 보는 중...' : 'AI 해설 다시 생성하기'}
      </ButtonPrimary>
      {error && (
        <p className="mt-2 text-center text-xs font-bold text-red">{error}</p>
      )}
    </div>
  );
}
