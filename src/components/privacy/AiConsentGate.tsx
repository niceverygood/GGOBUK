'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * App Store 5.1.1(i)/5.1.2(i) 대응.
 *
 * 로그인 후 메인 영역 진입 시 한 번, AI 전송 정보·전송 대상·이용 목적을
 * 명시한 모달을 띄워 동의를 받는다. 동의 전까지는 풀이·궁합 등
 * AI 호출 API 가 412 ai_consent_required 로 거절된다.
 */

type ConsentState = 'loading' | 'needed' | 'agreed' | 'error';

export function AiConsentGate() {
  const [state, setState] = useState<ConsentState>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/me/ai-consent', { cache: 'no-store' });
        if (!res.ok) {
          // 비로그인은 404/401 — 게이트 불필요.
          if (!cancelled) setState('agreed');
          return;
        }
        const json = (await res.json()) as { consented: boolean };
        if (cancelled) return;
        setState(json.consented ? 'agreed' : 'needed');
      } catch {
        if (!cancelled) setState('agreed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function agree() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/me/ai-consent', { method: 'POST' });
      if (!res.ok) throw new Error('동의 저장에 실패했어');
      setState('agreed');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어');
    } finally {
      setSubmitting(false);
    }
  }

  if (state !== 'needed') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-[28px] border border-line bg-white p-6 shadow-2xl sm:rounded-[28px]">
        <header className="mb-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-mint-dark">
            AI 데이터 사용 동의
          </p>
          <h2 id="ai-consent-title" className="mt-1 text-xl font-black text-navy">
            꼬북점이 AI로 풀이를 만들기 전에 한 가지 확인할게
          </h2>
        </header>

        <section className="space-y-4 text-sm font-semibold leading-7 text-ink">
          <div className="rounded-2xl border border-line bg-soft/70 p-4">
            <p className="text-xs font-black uppercase text-muted">
              전송되는 정보
            </p>
            <ul className="mt-1 list-inside list-disc text-sm font-bold text-ink">
              <li>이름(또는 별칭)·생년월일시·성별·음양력</li>
              <li>채팅으로 직접 입력한 질문 내용</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-soft/70 p-4">
            <p className="text-xs font-black uppercase text-muted">
              전송 대상
            </p>
            <p className="mt-1 text-sm font-bold text-ink">
              미국 Anthropic, PBC 의 Claude API.
              <br />
              모델 학습에는 사용되지 않으며, Anthropic 의 데이터 보존 정책에
              따라 처리돼.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-soft/70 p-4">
            <p className="text-xs font-black uppercase text-muted">
              이용 목적
            </p>
            <p className="mt-1 text-sm font-bold text-ink">
              사주 풀이·오늘의 운세·채팅 답변 생성에만
              사용돼. 광고·프로파일링에는 절대 쓰지 않아.
            </p>
          </div>

          <p className="text-xs font-bold text-muted">
            동의를 거부하면 사주 계산·등껍질 시각화는 그대로 사용할 수 있지만,
            AI 풀이 기능은 사용할 수 없어. 동의 후에도 언제든
            <Link
              href="/more/settings"
              className="underline underline-offset-2"
            >
              설정
            </Link>
            에서 철회할 수 있어.
          </p>
        </section>

        {error && (
          <p className="mt-3 text-center text-xs font-bold text-red">{error}</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={agree}
            disabled={submitting}
            className="w-full rounded-2xl bg-navy py-3.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(44,62,80,0.18)] disabled:opacity-60"
          >
            {submitting ? '저장 중…' : '동의하고 시작'}
          </button>
          <Link
            href="/privacy"
            className="text-center text-xs font-extrabold text-muted underline underline-offset-2"
          >
            개인정보 처리방침 전문 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
