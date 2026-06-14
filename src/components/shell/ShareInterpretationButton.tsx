'use client';

import { useRef, useState } from 'react';
import { Share2, Check } from 'lucide-react';
import type { InterpretationCategory } from '@/types/db';
import type { PersonaKey } from '@/lib/llm/personas';
import { track } from '@/lib/analytics/track';
import { withShareUtm } from '@/lib/seo/share_link';

interface Props {
  category: InterpretationCategory;
  persona: PersonaKey;
  /** 풀이가 아직 비어 있으면 공유 비활성화 */
  disabled?: boolean;
}

/**
 * 정밀 풀이 화면 하단에 노출되는 "친구한테 공유" 버튼.
 *
 * 클릭 → POST /api/share/create → 토큰 받음 → Web Share API 또는 clipboard.
 * 카카오톡·Twitter·iMessage 미리보기는 share 페이지의 OG meta로.
 */
export function ShareInterpretationButton({ category, persona, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracked = useRef(false);

  async function handleShare() {
    if (disabled || loading) return;
    setLoading(true);
    setError(null);
    if (!tracked.current) {
      tracked.current = true;
      track('share_click', { kind: 'interp', category, persona });
    }
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'interpretation', category, persona }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? '공유 링크를 만들지 못했어요.');
        return;
      }
      const url: string = withShareUtm(data.shareUrl, {
        campaign: 'interp',
        content: category,
      });
      // Native share API (iOS/Android) 우선
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: '내 사주 풀이 공유',
            text: '꼬북점에서 본 내 사주 풀이야',
            url,
          });
          setDone(true);
          return;
        } catch {
          // 사용자가 share 취소 → clipboard fallback
        }
      }
      // clipboard fallback
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      } else {
        // 매우 오래된 브라우저 — alert으로 노출
        window.prompt('아래 링크를 복사해 친구에게 보내세요:', url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '공유 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled || loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-mint/45 bg-mint/14 py-3 text-sm font-black text-mint-dark active:scale-[0.99] transition disabled:opacity-50"
      >
        {done ? (
          <>
            <Check size={16} strokeWidth={3} />
            링크 복사됨! 친구한테 붙여넣어줘
          </>
        ) : (
          <>
            <Share2 size={16} strokeWidth={2.5} />
            {loading ? '링크 만드는 중…' : '친구한테 공유하기'}
          </>
        )}
      </button>
      {error && (
        <p className="text-[11px] font-bold text-red text-center">{error}</p>
      )}
      {!error && !done && (
        <p className="text-[10px] font-bold text-muted text-center">
          공유 링크는 30일간 유효해요
        </p>
      )}
    </div>
  );
}
