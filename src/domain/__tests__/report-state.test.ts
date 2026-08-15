import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALLOWED_TRANSITIONS,
  REPORT_STATES,
  canTransition,
  isInFlight,
  isLeaseExpired,
  isTerminal,
  mayHaveCharged,
  type ReportState,
} from '@/domain/reports/state';

describe('리포트 상태 전이 규칙', () => {
  it('완료·취소는 terminal 이다', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(ALLOWED_TRANSITIONS.completed).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it('failed 는 terminal 이 아니다 — 재시도로 queued 로 돌아간다', () => {
    expect(isTerminal('failed')).toBe(false);
    expect(canTransition('failed', 'queued')).toBe(true);
  });

  it('결제 전 상태에서 곧바로 생성으로 건너뛸 수 없다', () => {
    expect(canTransition('preview_ready', 'generating')).toBe(false);
    expect(canTransition('draft', 'completed')).toBe(false);
    expect(canTransition('preview_ready', 'completed')).toBe(false);
  });

  it('정상 경로가 끝까지 이어진다', () => {
    const path: ReportState[] = [
      'draft',
      'previewing',
      'preview_ready',
      'payment_pending',
      'queued',
      'generating',
      'completed',
    ];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(
        canTransition(path[i], path[i + 1]),
        `${path[i]} → ${path[i + 1]}`,
      ).toBe(true);
    }
  });

  it('generating → queued 로 stale lease 를 회수할 수 있다', () => {
    expect(canTransition('generating', 'queued')).toBe(true);
  });

  it('완료 후에는 어떤 전이도 불가능하다', () => {
    for (const s of REPORT_STATES) {
      expect(canTransition('completed', s)).toBe(false);
    }
  });

  it('차감이 일어났을 수 있는 상태를 정확히 판별한다', () => {
    // 환불 판단의 근거라 잘못되면 이중 환불 또는 미환불이 된다.
    expect(mayHaveCharged('preview_ready')).toBe(false);
    expect(mayHaveCharged('payment_pending')).toBe(false);
    expect(mayHaveCharged('queued')).toBe(true);
    expect(mayHaveCharged('generating')).toBe(true);
    expect(mayHaveCharged('failed')).toBe(true);
    expect(mayHaveCharged('completed')).toBe(true);
  });

  it('진행 중 상태를 판별한다', () => {
    expect(isInFlight('queued')).toBe(true);
    expect(isInFlight('generating')).toBe(true);
    expect(isInFlight('previewing')).toBe(true);
    expect(isInFlight('completed')).toBe(false);
  });
});

describe('job lease', () => {
  it('lease 가 없으면 만료로 본다 (회수 가능)', () => {
    expect(isLeaseExpired(null)).toBe(true);
  });

  it('과거 lease 는 만료다', () => {
    expect(isLeaseExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });

  it('미래 lease 는 유효하다', () => {
    expect(isLeaseExpired(new Date(Date.now() + 60_000).toISOString())).toBe(
      false,
    );
  });
});

describe('SQL 허용표와 TS 허용표가 일치한다', () => {
  /**
   * migration 21 의 report_transition() 안에 있는 CASE 절을 파싱해
   * TS 의 ALLOWED_TRANSITIONS 와 대조한다.
   * 둘이 어긋나면 "코드는 허용하는데 DB 가 거부" 같은 진단 불가능한 버그가 난다.
   */
  const sql = readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'supabase',
      'migrations',
      '00000000000021_reports_and_entitlements.sql',
    ),
    'utf8',
  );

  const caseBlock = sql.slice(
    sql.indexOf('v_allowed := case p_from'),
    sql.indexOf('else false'),
  );

  for (const from of REPORT_STATES) {
    const expected = ALLOWED_TRANSITIONS[from];
    if (expected.length === 0) {
      it(`${from} 은 SQL 에도 전이 규칙이 없다`, () => {
        expect(caseBlock).not.toContain(`when '${from}'`);
      });
      continue;
    }

    it(`${from} 의 허용 목록이 SQL 과 같다`, () => {
      const line = caseBlock
        .split('\n')
        .find((l) => l.includes(`when '${from}'`));
      expect(line, `SQL 에 ${from} 분기가 있어야 한다`).toBeTruthy();

      const inList = line!.match(/in \(([^)]*)\)/)?.[1] ?? '';
      const sqlTargets = inList
        .split(',')
        .map((s) => s.trim().replace(/'/g, ''))
        .filter(Boolean)
        .sort();

      expect(sqlTargets).toEqual([...expected].sort());
    });
  }
});
