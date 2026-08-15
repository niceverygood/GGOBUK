/**
 * 무료권 window 계산 — 순수 함수.
 *
 * 명세 §5.2
 *  - 채팅 무료 질문권: 매일 **KST 23:00** 에 새 window 시작. 누적 없음.
 *  - 오늘의 운세 무료권: 매일 **KST 00:00** 갱신.
 *
 * ⚠️ 서버 시스템 시간대나 브라우저 로컬 날짜 문자열에 의존하지 않는다(§2.2).
 *    UTC epoch 를 KST 로 옮겨 계산한 뒤 다시 UTC 로 돌려준다.
 *
 * `src/domain` 규약: Next / DB / LLM 을 import 하지 않는다.
 */

const KST_OFFSET_MS = 9 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

export type EntitlementType = 'chat_question' | 'daily_fortune';

export interface Window {
  /** ISO 8601 (UTC) */
  start: string;
  /** ISO 8601 (UTC) */
  end: string;
}

/**
 * `at` 시점이 속한 window 를 구한다.
 *
 * `startHourKst` 를 경계로 하루를 자른다. 예를 들어 23시 경계라면
 * KST 22:59 는 "어제 23:00 ~ 오늘 23:00" window 에, 23:00 은 다음 window 에 속한다.
 */
export function windowFor(
  startHourKst: number,
  at: Date = new Date(),
): Window {
  // KST 벽시계 기준으로 옮긴 뒤 계산한다.
  const kstMs = at.getTime() + KST_OFFSET_MS;
  const kst = new Date(kstMs);

  // 오늘(KST)의 경계 시각
  const boundaryKstMs = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate(),
    startHourKst,
    0,
    0,
    0,
  );

  // 아직 경계 전이면 이전 window 에 속한다.
  const startKstMs =
    kstMs >= boundaryKstMs ? boundaryKstMs : boundaryKstMs - DAY_MS;

  return {
    start: new Date(startKstMs - KST_OFFSET_MS).toISOString(),
    end: new Date(startKstMs + DAY_MS - KST_OFFSET_MS).toISOString(),
  };
}

/** 다음 window 시작까지 남은 밀리초 — 홈 카운트다운에 쓴다. */
export function msUntilNextWindow(
  startHourKst: number,
  at: Date = new Date(),
): number {
  const { end } = windowFor(startHourKst, at);
  return Math.max(0, new Date(end).getTime() - at.getTime());
}

/** "N시간 M분 뒤" 표기 (사용자 노출용). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return '곧';
}
