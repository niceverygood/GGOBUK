'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// 쿠키는 페이지 수명 중 바뀌지 않으므로 구독은 no-op. 서버 스냅샷=false(비로그인
// 기준 렌더 → 하이드레이션 일치), 클라 스냅샷=실제 auth 쿠키 유무.
const noopSubscribe = () => () => {};
function readLoggedIn(): boolean {
  return /sb-[^=]+-auth-token=/.test(document.cookie);
}

/**
 * 일주 SEO 페이지(/ilju/[slug])의 비로그인 모바일 전환용 sticky 하단 CTA.
 *
 * 페이지 자체는 정적 캐시(크롤러·공유 미리보기)라 서버에서 인증을 보지 않는다.
 * 대신 클라이언트에서 supabase auth 쿠키 유무로 "비로그인"일 때만 노출 →
 * 공유로 유입된 잠재 사용자에게만 가입 동선을 들이민다(로그인 유저에겐 숨김).
 *
 * ⚠️ 무료 가입·확인 동선만 — 충전/결제(IAP·카카오페이) 링크는 절대 넣지 않는다.
 */
export function IljuSignupCta() {
  const loggedIn = useSyncExternalStore(
    noopSubscribe,
    readLoggedIn,
    () => false,
  );

  if (loggedIn) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur">
      <div className="mx-auto max-w-md">
        <Link
          href="/preview"
          className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-navy text-sm font-black text-white shadow-[0_12px_24px_rgba(44,62,80,0.22)]"
        >
          30초면 끝나요 · 무료로 내 일주 확인하기
          <ArrowRight size={16} strokeWidth={3} />
        </Link>
        <p className="mt-1.5 text-center text-[11px] font-bold text-muted">
          가입하면 꼬북알 30개 즉시 지급 · 정밀 풀이 바로 열기
        </p>
      </div>
    </div>
  );
}
