import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findDuplicateProfile,
  isIdentityConflict,
  normalizeProfileName,
} from '@/lib/saju/profile_dedup';

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');
const migration = (prefix: string) =>
  readFileSync(
    join(MIGRATIONS, readdirSync(MIGRATIONS).find((f) => f.startsWith(prefix))!),
    'utf8',
  );

/** migration 20 의 identity_hash 생성식만 잘라낸다. */
function identityHashExpression(): string {
  const sql = migration('00000000000020');
  const from = sql.indexOf('add column if not exists identity_hash');
  const to = sql.indexOf(') stored;', from);
  expect(from, 'identity_hash 정의를 찾지 못했다').toBeGreaterThan(-1);
  return sql.slice(from, to);
}

/**
 * 앱의 중복 판정과 DB unique 인덱스는 **같은 기준**이어야 한다.
 *
 * 2026-08-16: 어긋나 있었다. DB 해시는 relation_type 을 안 쓰고 이름을 정규화하는데
 * 앱은 relation_type 으로 걸러내고 이름을 정확 일치로 봤다. 그래서 앱이 "중복 아님"
 * 으로 통과시킨 insert 를 DB 가 23505 로 거부 → 사용자에게 원인 모를 500.
 * 이 테스트는 그 어긋남을 다시 만들면 깨진다.
 */
describe('DB identity_hash 와 앱 판정 기준이 같다', () => {
  const expr = identityHashExpression();

  it('DB 해시는 relation_type 을 쓰지 않는다', () => {
    // 쓰기 시작하면 앱도 같이 바꿔야 한다 — 그 신호를 여기서 준다.
    expect(expr).not.toContain('relation_type');
  });

  it('DB 해시가 쓰는 필드는 앱이 조회하는 필드와 같다', () => {
    for (const field of [
      'owner_id',
      'name',
      'birth_date',
      'birth_time',
      'is_lunar',
      'is_leap_month',
      'gender',
    ]) {
      expect(expr, `${field} 가 해시에 없다`).toContain(field);
    }
  });

  it('DB 는 이름의 공백을 지우고 소문자로 만든다 — 앱 정규화도 같다', () => {
    expect(expr).toContain('lower(');
    expect(expr).toContain("regexp_replace");
    expect(normalizeProfileName('홍 길동')).toBe(normalizeProfileName('홍길동'));
    expect(normalizeProfileName('  Kim  Yuna ')).toBe('kimyuna');
    expect(normalizeProfileName(null)).toBe('');
  });
});

describe('unique 위반 판별', () => {
  it('23505 만 동일 인물 충돌로 본다', () => {
    expect(isIdentityConflict({ code: '23505' })).toBe(true);
    expect(isIdentityConflict({ code: '23503' })).toBe(false); // FK 위반은 다른 문제
    expect(isIdentityConflict(null)).toBe(false);
    expect(isIdentityConflict(undefined)).toBe(false);
  });
});

/** 적용된 필터를 기록하는 최소 쿼리 빌더. */
function makeClient(rows: Record<string, unknown>[]) {
  const filters: { op: string; key: string; value: unknown }[] = [];
  const q: Record<string, unknown> = {};
  Object.assign(q, {
    select: () => q,
    eq: (key: string, value: unknown) => {
      filters.push({ op: 'eq', key, value });
      return q;
    },
    is: (key: string, value: unknown) => {
      filters.push({ op: 'is', key, value });
      return q;
    },
    order: () => q,
    returns: () => Promise.resolve({ data: rows, error: null }),
  });
  return {
    client: { from: () => q } as never,
    filters,
  };
}

const identity = {
  name: '홍길동',
  birth_date: '1990-01-01',
  birth_time: '10:30',
  is_lunar: false,
  is_leap_month: false,
  gender: 'M' as const,
  relation_type: 'self',
};

describe('findDuplicateProfile', () => {
  it('relation_type 으로 거르지 않는다 (DB 해시와 맞춘다)', async () => {
    const { client, filters } = makeClient([]);
    await findDuplicateProfile(client, 'owner-1', identity);
    expect(filters.map((f) => f.key)).not.toContain('relation_type');
  });

  it('정리된 프로필은 후보에서 뺀다', async () => {
    const { client, filters } = makeClient([]);
    await findDuplicateProfile(client, 'owner-1', identity);
    expect(filters).toContainEqual({ op: 'is', key: 'deleted_at', value: null });
  });

  it('관계 유형이 달라도 같은 사람이면 기존 행을 돌려준다', async () => {
    // 이 케이스가 프로덕션에 실재했다 — self 와 friend 로 두 번 등록된 사람.
    const { client } = makeClient([
      { id: 'p1', name: '홍길동', relation_type: 'friend' },
    ]);
    const hit = await findDuplicateProfile(client, 'owner-1', identity);
    expect(hit).toMatchObject({ id: 'p1' });
  });

  it('이름의 공백·대소문자 차이를 같은 사람으로 본다', async () => {
    const { client } = makeClient([{ id: 'p1', name: '홍 길동' }]);
    expect(await findDuplicateProfile(client, 'owner-1', identity)).toMatchObject(
      { id: 'p1' },
    );
  });

  it('이름이 실제로 다르면 중복이 아니다', async () => {
    const { client } = makeClient([{ id: 'p1', name: '김철수' }]);
    expect(await findDuplicateProfile(client, 'owner-1', identity)).toBeNull();
  });

  it('생일이 같은 여러 명 중 이름이 맞는 사람을 고른다', async () => {
    const { client } = makeClient([
      { id: 'p1', name: '김철수' },
      { id: 'p2', name: '홍길동' },
    ]);
    expect(await findDuplicateProfile(client, 'owner-1', identity)).toMatchObject(
      { id: 'p2' },
    );
  });

  it('시간 모름(null)은 null 로 조회한다', async () => {
    const { client, filters } = makeClient([]);
    await findDuplicateProfile(client, 'owner-1', {
      ...identity,
      birth_time: null,
    });
    expect(filters).toContainEqual({ op: 'is', key: 'birth_time', value: null });
  });
});
