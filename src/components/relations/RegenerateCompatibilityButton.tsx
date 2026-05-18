'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ButtonPrimary } from '@/components/ui/primitives';
import { CREDIT_COSTS } from '@/lib/credits';

function messageForError(error: string): string {
  if (error === 'llm_not_configured')
    return 'AI 키 설정이 아직 안 되어 있어요.';
  if (error === 'unauthorized') return '로그인이 필요해요.';
  if (error === 'no self profile') return '내 사주가 먼저 필요해요.';
  if (error === 'other not found') return '상대 사주를 찾지 못했어요.';
  if (error === 'insufficient_credits') return '크래딧이 부족해요.';
  return '궁합 생성에 실패했어요. 잠시 후 다시 시도해 주세요.';
}

export function RegenerateCompatibilityButton({
  sajuBId,
  relationLabel,
  hasCompatibility,
}: {
  sajuBId: string;
  relationLabel: string | null;
  hasCompatibility: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function regenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/relations/compat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saju_b_id: sajuBId,
          ...(relationLabel ? { relation_label: relationLabel } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'unknown',
        );
      router.refresh();
    } catch (e) {
      setError(messageForError(e instanceof Error ? e.message : 'unknown'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <ButtonPrimary onClick={regenerate} disabled={loading} tone="mint">
        {loading
          ? 'AI가 깊게 다시 보는 중...'
          : hasCompatibility
            ? `크래딧 ${CREDIT_COSTS.compatibility}개로 다시 생성`
            : `크래딧 ${CREDIT_COSTS.compatibility}개로 AI 궁합 생성`}
      </ButtonPrimary>
      {error && (
        <p className="mt-2 text-center text-xs font-bold text-red">{error}</p>
      )}
    </div>
  );
}
