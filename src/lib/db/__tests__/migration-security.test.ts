import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 마이그레이션 정적 회귀 테스트.
 *
 * 라이브 DB 없이도 "권한상승 구멍이 다시 열리는" 회귀를 잡는다.
 * 실제 REST 공격 검증은 스테이징 DB가 붙은 뒤 통합 테스트로 별도 추가한다
 * (docs/parity-rebuild/QA_MATRIX.md 참조).
 */

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql'));
const all = files
  .sort()
  .map((f) => readFileSync(join(DIR, f), 'utf8'))
  .join('\n');

/** 주석을 제거해 "실제 실행되는 SQL"만 검사한다. */
const sql = all
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n');

/**
 * 함수의 **마지막** 정의 본문만 잘라낸다.
 * `create or replace` 가 여러 번 나올 수 있으므로 최신 정의가 검사 대상이고,
 * 뒤따르는 grant/revoke 문이 섞이지 않도록 종료 구분자 `$$` 에서 끊는다.
 */
function functionBody(name: string): string {
  const parts = sql.split(new RegExp(`create or replace function public\\.${name}\\b`, 'i'));
  if (parts.length < 2) return '';
  const tail = parts[parts.length - 1];
  const end = tail.indexOf('$$;');
  return end === -1 ? tail : tail.slice(0, end);
}

describe('users 권한상승 차단', () => {
  it('authenticated 의 광범위 UPDATE/INSERT 를 회수한다', () => {
    expect(sql).toMatch(/revoke\s+update\s+on\s+public\.users\s+from[^;]*authenticated/i);
    expect(sql).toMatch(/revoke\s+insert\s+on\s+public\.users\s+from[^;]*authenticated/i);
  });

  it('민감 컬럼은 컬럼 단위 grant 에 포함되지 않는다', () => {
    const grant = sql.match(
      /grant\s+update\s*\(([^)]*)\)\s*\n?\s*on\s+public\.users\s+to\s+authenticated/i,
    );
    expect(grant, 'users 컬럼 단위 UPDATE grant 가 있어야 한다').toBeTruthy();
    const cols = grant![1];
    for (const forbidden of [
      'credit_balance',
      'is_admin',
      'is_pro',
      'pro_expires_at',
      'signup_bonus_granted',
      'ai_consent_at',
      'bread_stamps',
      'bread_reward_count',
    ]) {
      expect(cols, `${forbidden} 은 사용자가 직접 쓸 수 없어야 한다`).not.toContain(
        forbidden,
      );
    }
  });
});

describe('usage_logs 무료 한도 변조 차단', () => {
  it('FOR ALL 정책을 제거하고 SELECT 만 남긴다', () => {
    expect(sql).toMatch(/drop policy if exists "usage all own" on public\.usage_logs/i);
    expect(sql).toMatch(/create policy "usage select own"[\s\S]*?for select/i);
  });

  it('사용자 롤의 쓰기 권한을 회수한다', () => {
    expect(sql).toMatch(
      /revoke\s+insert,\s*update,\s*delete\s+on\s+public\.usage_logs\s+from[^;]*authenticated/i,
    );
  });
});

describe('usage RPC 호출자 검증과 KST 날짜', () => {
  for (const fn of ['increment_chat_usage', 'increment_interp_views']) {
    it(`${fn} 이 호출자를 검증한다`, () => {
      const body = functionBody(fn);
      expect(body, `${fn} 정의를 찾지 못했다`).not.toBe('');
      expect(body).toMatch(/auth\.uid\(\)\s*=\s*p_user_id/);
      expect(body).toMatch(/is_service_role\(\)/);
    });

    it(`${fn} 이 KST 날짜 키를 쓴다`, () => {
      expect(functionBody(fn)).toContain(`at time zone 'Asia/Seoul'`);
    });
  }
});

describe('open_bread 임의 재화 발행 차단', () => {
  it('경제 파라미터를 함수 인자로 받지 않는다', () => {
    const sig = sql.match(/create or replace function public\.open_bread\(([^)]*)\)/i);
    expect(sig, 'open_bread 정의가 있어야 한다').toBeTruthy();
    const params = sig![1];
    expect(params).toContain('p_user_id');
    for (const forbidden of [
      'p_stamps_per_reward',
      'p_credits_per_reward',
      'p_monthly_cap',
      'p_golden_chance',
      'p_golden_bonus',
    ]) {
      expect(params, `${forbidden} 을 인자로 받으면 재화 발행이 조작된다`).not.toContain(
        forbidden,
      );
    }
  });

  it('보상 상수를 함수 내부에 고정한다', () => {
    const body = functionBody('open_bread');
    expect(body).toMatch(/c_credits_per_reward\s+constant/);
    expect(body).toMatch(/c_monthly_cap\s+constant/);
  });
});

describe('서버 생성 결과물 무결성', () => {
  it('사용자 롤이 결과 테이블에 직접 쓰지 못한다', () => {
    for (const table of [
      'interpretations',
      'daily_fortunes',
      'bread_opens',
      'monthly_readings',
    ]) {
      expect(
        sql,
        `${table} 에 대한 사용자 쓰기 권한 회수가 필요하다`,
      ).toMatch(
        new RegExp(
          `revoke\\s+insert,\\s*update,\\s*delete\\s+on\\s+public\\.${table}\\s+from[^;]*authenticated`,
          'i',
        ),
      );
    }
  });

  it('유료 결과 테이블에 FOR ALL 사용자 정책이 없다', () => {
    expect(sql).not.toMatch(
      /create policy "monthly readings all own"[\s\S]{0,40}for all/i,
    );
    expect(sql).not.toMatch(/create policy "bread opens all own"[\s\S]{0,40}for all/i);
  });
});
