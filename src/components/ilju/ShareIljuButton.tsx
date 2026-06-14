'use client';

import { useRef, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { track } from '@/lib/analytics/track';
import { withShareUtm } from '@/lib/seo/share_link';

interface Props {
  /** 공유할 카드 절대 URL (/ilju/[slug]) */
  url: string;
  /** 일주 한글명 (예: 갑자) */
  name: string;
  /** 오행 강조색 — 카드 정체성과 버튼을 묶는다 */
  accent: string;
  /** 일주 슬러그 — 공유 귀속(utm_content)·계측용 */
  slug?: string;
  /** 버튼 라벨 오버라이드 */
  label?: string;
  /** 추가 클래스 (예: w-full) */
  className?: string;
}

/**
 * "내 사주 캐릭터 카드" 공유 버튼.
 *
 * 바이럴 루프의 핵심 행동. 1인칭 카피("나는 X일주래. 너는?")로 호기심을 자극해
 * 받는 사람이 자기 일주를 확인하러 들어오게 만든다. 네이티브 공유 시트 →
 * 클립보드 → prompt 순으로 우아하게 폴백한다.
 */
export function ShareIljuButton({
  url,
  name,
  accent,
  slug,
  label,
  className = '',
}: Props) {
  const [done, setDone] = useState(false);
  const tracked = useRef(false);

  async function share() {
    const text = `나는 ${name}일주래. 너는 무슨 일주일까? 🐢`;
    const shareUrl = withShareUtm(url, { campaign: 'ilju', content: slug });
    // 공유 의도 1회만 계측 (share/clipboard 양쪽 폴백 중복 발화 차단).
    if (!tracked.current) {
      tracked.current = true;
      track('share_click', { kind: 'ilju', slug });
    }
    // 1) 네이티브 공유 시트 (모바일에서 카톡·인스타로 바로)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name}일주 · 꼬북점`, text, url: shareUrl });
        return;
      } catch {
        // 사용자가 닫았거나 미지원 — 클립보드로 폴백
      }
    }
    // 2) 클립보드 복사
    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      return;
    } catch {
      // 3) 최후 폴백 — prompt
      window.prompt('아래 링크를 복사해서 공유해줘', shareUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      style={{ background: accent }}
      className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-[0_12px_22px_rgba(44,62,80,0.18)] ${className}`}
    >
      {done ? (
        <Check size={18} strokeWidth={3} />
      ) : (
        <Share2 size={18} strokeWidth={2.6} />
      )}
      {done ? '링크 복사됨!' : (label ?? '내 캐릭터 카드 공유하기')}
    </button>
  );
}
