/**
 * 리포트 상태머신 — 순수 규칙.
 *
 * 명세 §6.3 의 전이를 코드로 못 박는다. DB 는 이 규칙을 compare-and-swap
 * (허용된 이전 상태를 WHERE 에 포함)으로 강제하고, 여기서는 그 허용표를 정의한다.
 *
 * `src/domain` 규약: Next / DB / LLM 을 import 하지 않는다.
 */

export const REPORT_STATES = [
  'draft',
  'previewing',
  'preview_ready',
  'payment_pending',
  'queued',
  'generating',
  'completed',
  'failed',
  'cancelled',
] as const;

export type ReportState = (typeof REPORT_STATES)[number];

/** 더 이상 전이하지 않는 상태. */
export const TERMINAL_STATES: readonly ReportState[] = [
  'completed',
  'cancelled',
];

/**
 * 허용 전이표.
 *
 * 설계 노트
 *  - `failed` 는 terminal 이 **아니다**. 재시도(`retry`)로 `queued` 로 돌아간다.
 *    단 재시도는 같은 idempotency key 를 써서 이중 과금이 없어야 한다(§6.3).
 *  - `payment_pending → queued` 는 차감 성공 직후에만 일어난다.
 *  - `generating → queued` 는 stale lease 회수(worker 가 죽은 경우)를 위한 것이다.
 */
export const ALLOWED_TRANSITIONS: Record<ReportState, readonly ReportState[]> = {
  draft: ['previewing', 'cancelled'],
  previewing: ['preview_ready', 'failed', 'cancelled'],
  preview_ready: ['payment_pending', 'cancelled'],
  payment_pending: ['queued', 'failed', 'cancelled'],
  queued: ['generating', 'failed', 'cancelled'],
  generating: ['completed', 'failed', 'queued'],
  completed: [],
  failed: ['queued', 'cancelled'],
  cancelled: [],
};

export function canTransition(from: ReportState, to: ReportState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(state: ReportState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** 사용자에게 "만들고 있는 중"으로 보여야 하는 상태. */
export function isInFlight(state: ReportState): boolean {
  return state === 'queued' || state === 'generating' || state === 'previewing';
}

/**
 * 차감이 이미 일어났을 수 있는 상태.
 * 이 상태에서 최종 실패하면 **정확히 한 번** 환불해야 한다(§6.3).
 */
export function mayHaveCharged(state: ReportState): boolean {
  return (
    state === 'queued' ||
    state === 'generating' ||
    state === 'completed' ||
    state === 'failed'
  );
}

// ─── job lease ──────────────────────────────────────────────────────────────

/** worker 가 job 을 잡는 기본 임대 시간. 이 시간을 넘기면 회수 대상. */
export const JOB_LEASE_MS = 3 * 60_000;

/** 최대 시도 횟수. 초과하면 failed 로 고정하고 환불한다. */
export const JOB_MAX_ATTEMPTS = 3;

/**
 * 사용자에게 문의 안내를 띄우는 기준(§6.3: 3분 초과).
 * ⚠️ 안내만 하고 **임의로 실패 처리하지 않는다** — job 은 계속 살아 있다.
 */
export const SLOW_GENERATION_HINT_MS = 3 * 60_000;

export function isLeaseExpired(leaseUntil: string | null, now = Date.now()) {
  if (!leaseUntil) return true;
  return new Date(leaseUntil).getTime() < now;
}
