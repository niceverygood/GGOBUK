'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, Loader2, X } from 'lucide-react';
import {
  acknowledgeAll,
  getActiveItems,
  getCompletedItems,
  getUnreadCount,
  isAcknowledged,
  subscribeGenerationLock,
  type GenerationItem,
} from '@/lib/utils/generation-lock';

/**
 * Floating chip — 화면 어디서든 진행 중인 LLM 작업을 한눈에.
 *
 * 사용자가 풀이를 시작하고 다른 탭/페이지로 갔다 와도 어떤 풀이가 돌고
 * 있는지 헷갈리지 않게 표시. 탭하면 활성+최근 완료 목록을 펼친다.
 *
 * 표시 규칙:
 * - 활성 작업이 1개 이상이면 무조건 보임 (현재 진행 1번째 label 표시)
 * - 활성 없고 미확인 완료만 있으면 "✓ 완료" 모드로 보임
 * - 둘 다 없으면 숨김
 *
 * 위치: BottomNav 바로 위, 가운데 정렬.
 */
export function GenerationStatusChip() {
  const router = useRouter();
  // tick은 (1) 레지스트리 변경 (2) 1초 elapsed 갱신 둘 다 처리.
  const [, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return subscribeGenerationLock(() => setTick((t) => t + 1));
  }, []);

  // 매 렌더마다 직접 조회 — 레지스트리는 module-level Map 이고 setTick
  // 으로 강제 re-render 함.
  const activeNow = getActiveItems();
  const completedNow = getCompletedItems();
  const unreadNow = getUnreadCount();

  const hasActive = activeNow.length > 0;
  const hasUnread = unreadNow > 0;

  // 활성 작업이 있을 동안만 elapsed 표시를 위해 1초마다 re-render.
  useEffect(() => {
    if (!hasActive && !open) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasActive, open]);

  if (!hasActive && !hasUnread && !open) return null;

  const headline: GenerationItem | null = activeNow[0] ?? completedNow[0] ?? null;
  if (!headline) return null;

  const moreActiveCount = Math.max(0, activeNow.length - 1);

  function handleOpen() {
    setOpen(true);
    // Mark all completed as seen as soon as the user opens the panel.
    acknowledgeAll();
  }

  function handleClose() {
    setOpen(false);
  }

  function goToItem(item: GenerationItem) {
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="풀이 생성 상태 보기"
          className="fixed left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 rounded-full border border-navy/12 bg-white/95 backdrop-blur-md shadow-[0_10px_24px_rgba(44,62,80,0.16)] px-3.5 py-2 transition active:scale-95"
          style={{
            bottom:
              'calc(env(safe-area-inset-bottom) + 4.5rem)',
          }}
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-white shadow-sm">
            {hasActive ? (
              <Loader2 size={11} strokeWidth={3.5} className="animate-spin" />
            ) : (
              <CheckCircle2 size={11} strokeWidth={3.5} />
            )}
          </span>
          <span className="max-w-[44vw] truncate text-[11px] font-black text-navy">
            {hasActive ? (
              <>
                풀이 중 · {headline.label}
                {moreActiveCount > 0 && (
                  <span className="ml-1 text-mint-dark">+{moreActiveCount}</span>
                )}
              </>
            ) : (
              <>완료 · {headline.label}</>
            )}
          </span>
          <span
            className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-navy text-white"
            aria-hidden
          >
            <ChevronRight size={9} strokeWidth={3.5} />
          </span>
          {hasUnread && !hasActive && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-red text-white text-[9px] font-black px-1 shadow-sm"
            >
              {unreadNow}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="풀이 생성 상태"
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-[0_-20px_44px_rgba(44,62,80,0.24)]"
            style={{
              paddingBottom:
                'calc(env(safe-area-inset-bottom) + 1.25rem)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-muted">백그라운드 풀이</p>
                <h2 className="text-base font-black text-navy">
                  진행 중 {activeNow.length} · 완료 {completedNow.length}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="닫기"
                className="grid h-9 w-9 place-items-center rounded-2xl bg-ivory/70 text-navy active:scale-95"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2">
              {activeNow.length === 0 && completedNow.length === 0 && (
                <div className="rounded-2xl bg-ivory/70 p-5 text-center">
                  <p className="text-sm font-black text-navy">
                    진행 중인 풀이가 없어요
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-muted">
                    풀이를 시작하면 여기서 진행 상태를 볼 수 있어요.
                  </p>
                </div>
              )}

              {activeNow.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToItem(item)}
                  disabled={!item.href}
                  className="flex w-full items-center gap-3 rounded-2xl border border-navy/10 bg-white p-3 text-left active:scale-[0.99] disabled:opacity-90"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/8 text-navy">
                    <Loader2 size={16} strokeWidth={3} className="animate-spin" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-black text-navy truncate">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-bold text-mint-dark">
                      생성 중 · {elapsedHint(item.startedAt)}
                    </span>
                  </span>
                  {item.href && (
                    <ChevronRight
                      size={16}
                      strokeWidth={2.6}
                      className="shrink-0 text-muted"
                    />
                  )}
                </button>
              ))}

              {completedNow.map((item) => {
                const unreadDot = !isAcknowledged(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToItem(item)}
                    disabled={!item.href}
                    className="flex w-full items-center gap-3 rounded-2xl border border-navy/8 bg-ivory/60 p-3 text-left active:scale-[0.99] disabled:opacity-90"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                        item.status === 'success'
                          ? 'bg-mint/35 text-[#16706B]'
                          : 'bg-red/15 text-red'
                      }`}
                    >
                      <CheckCircle2 size={16} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="block text-[13px] font-black text-navy truncate">
                          {item.label}
                        </span>
                        {unreadDot && (
                          <span
                            aria-hidden
                            className="h-2 w-2 shrink-0 rounded-full bg-red"
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-bold text-muted">
                        {item.status === 'success' ? '완료' : '실패'} ·{' '}
                        {settledHint(item.settledAt)}
                      </span>
                    </span>
                    {item.href && (
                      <ChevronRight
                        size={16}
                        strokeWidth={2.6}
                        className="shrink-0 text-muted"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[10px] font-bold text-muted">
              진행 중에도 다른 페이지로 이동할 수 있어요. 끝나면 여기서 결과로
              바로 갈 수 있어요.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function elapsedHint(startedAt: number): string {
  const elapsed = Math.max(0, Date.now() - startedAt);
  const s = Math.floor(elapsed / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}분 ${rs}초`;
}

function settledHint(settledAt: number | undefined): string {
  if (!settledAt) return '방금';
  const ago = Math.max(0, Date.now() - settledAt);
  const s = Math.floor(ago / 1000);
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return `${h}시간 전`;
}
