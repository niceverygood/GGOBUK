import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  msUntilNextWindow,
  windowFor,
} from '@/domain/entitlements/window';
import { ENTITLEMENT } from '@/domain/policy/catalog';

/**
 * 명세 §17.3 이 요구하는 KST 경계 테스트.
 *  - 채팅 질문권: KST 22:59 / 23:00
 *  - 오늘의 운세: KST 23:59 / 00:00
 *
 * 헬퍼: KST 벽시계 → UTC Date
 */
function kst(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm = 0,
  ss = 0,
): Date {
  return new Date(Date.UTC(y, m - 1, d, hh - 9, mm, ss));
}

/** UTC Date → 'YYYY-MM-DD HH:mm' (KST 표기) */
function asKst(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 9 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

describe('채팅 무료 질문권 — KST 23:00 경계', () => {
  const H = ENTITLEMENT.chatQuestion.windowStartHourKst;

  it('상수가 23시로 고정돼 있다', () => {
    expect(H).toBe(23);
  });

  it('KST 22:59 는 전날 23:00 window 에 속한다', () => {
    const w = windowFor(H, kst(2026, 8, 14, 22, 59));
    expect(asKst(w.start)).toBe('2026-08-13 23:00');
    expect(asKst(w.end)).toBe('2026-08-14 23:00');
  });

  it('KST 23:00 정각에 새 window 가 시작된다', () => {
    const w = windowFor(H, kst(2026, 8, 14, 23, 0));
    expect(asKst(w.start)).toBe('2026-08-14 23:00');
    expect(asKst(w.end)).toBe('2026-08-15 23:00');
  });

  it('22:59 와 23:00 은 서로 다른 window 다 (=질문권이 새로 생긴다)', () => {
    const before = windowFor(H, kst(2026, 8, 14, 22, 59, 59));
    const after = windowFor(H, kst(2026, 8, 14, 23, 0, 0));
    expect(before.start).not.toBe(after.start);
  });

  it('자정을 넘겨도 같은 window 를 유지한다 (23시 경계이므로)', () => {
    const beforeMidnight = windowFor(H, kst(2026, 8, 14, 23, 30));
    const afterMidnight = windowFor(H, kst(2026, 8, 15, 0, 30));
    expect(afterMidnight.start).toBe(beforeMidnight.start);
  });
});

describe('오늘의 운세 무료권 — KST 00:00 경계', () => {
  const H = ENTITLEMENT.dailyFortune.windowStartHourKst;

  it('상수가 0시로 고정돼 있다', () => {
    expect(H).toBe(0);
  });

  it('KST 23:59 는 그날 window 에 속한다', () => {
    const w = windowFor(H, kst(2026, 8, 14, 23, 59));
    expect(asKst(w.start)).toBe('2026-08-14 00:00');
    expect(asKst(w.end)).toBe('2026-08-15 00:00');
  });

  it('KST 00:00 에 새 window 가 시작된다', () => {
    const w = windowFor(H, kst(2026, 8, 15, 0, 0));
    expect(asKst(w.start)).toBe('2026-08-15 00:00');
  });

  it('23:59 와 00:00 은 서로 다른 window 다', () => {
    const before = windowFor(H, kst(2026, 8, 14, 23, 59, 59));
    const after = windowFor(H, kst(2026, 8, 15, 0, 0, 0));
    expect(before.start).not.toBe(after.start);
  });
});

describe('서버 시간대 비의존성', () => {
  it('같은 순간이면 어떤 방식으로 만든 Date 든 같은 window 를 준다', () => {
    // 동일 epoch 를 가리키는 두 Date (표현만 다름)
    const a = kst(2026, 8, 14, 22, 59);
    const b = new Date(a.getTime());
    expect(windowFor(23, a)).toEqual(windowFor(23, b));
  });

  it('window 는 정확히 24시간이다', () => {
    for (const h of [0, 9, 23]) {
      const w = windowFor(h, kst(2026, 8, 14, 12));
      const span = new Date(w.end).getTime() - new Date(w.start).getTime();
      expect(span).toBe(24 * 3600_000);
    }
  });
});

describe('카운트다운', () => {
  it('경계 직전에는 1분 미만이 남는다', () => {
    const ms = msUntilNextWindow(23, kst(2026, 8, 14, 22, 59, 30));
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(30_000);
  });

  it('경계 직후에는 거의 24시간이 남는다', () => {
    const ms = msUntilNextWindow(23, kst(2026, 8, 14, 23, 0, 1));
    expect(ms).toBeGreaterThan(23 * 3600_000);
  });

  it('사람이 읽는 문구로 변환한다', () => {
    expect(formatCountdown(2 * 3600_000 + 5 * 60_000)).toBe('2시간 5분');
    expect(formatCountdown(7 * 60_000)).toBe('7분');
    expect(formatCountdown(3_000)).toBe('곧');
    expect(formatCountdown(-1)).toBe('곧');
  });
});
