import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// 운영 스크립트(scripts/db.mjs)의 순수 함수만 가져온다 — CLI 는 직접 실행할 때만 돈다.
import {
  looksLikeToken,
  stripFunctionBodies,
  summarize,
  touchesUserData,
} from '../../../../scripts/db.mjs';

const DIR = join(process.cwd(), 'supabase', 'migrations');
const read = (n: string) =>
  readFileSync(
    join(DIR, readdirSync(DIR).find((f) => f.startsWith(n))!),
    'utf8',
  );

/**
 * `db:apply` 게이트 회귀 테스트.
 *
 * 2026-08-16 사고: migration 22(사용자 데이터 변경, 승인 대기)가 `--yes` 하나로
 * 프로덕션에 적용됐다. 안내 코드블록에 `--yes` 가 들어 있었고 사용자가 통째로 붙여넣었다.
 * 이후 데이터 변경 마이그레이션은 **손으로 번호를 타이핑**해야만 적용되게 바꿨다.
 *
 * 이 테스트가 지키는 것은 그 게이트가 **발동하는 조건**이다.
 * 분류가 조용히 느슨해지면(또는 너무 빡빡해지면) 여기서 깨진다.
 */
describe('마이그레이션이 사용자 데이터를 건드리는지 분류', () => {
  it('순수 스키마 변경은 타이핑 확인을 요구하지 않는다', () => {
    // 18: 테이블 + RPC, 19: 권한 축소 + RPC, 21: 테이블 + RPC 4개
    for (const n of ['00000000000018', '00000000000019', '00000000000021']) {
      expect(touchesUserData(read(n)).yes, `${n} 이 데이터 변경으로 오탐됨`).toBe(
        false,
      );
    }
  });

  it('백필·정리 마이그레이션은 타이핑 확인을 요구한다', () => {
    // 20: 대표프로필 백필 2건, 22: 중복 정리 3건 + 🔴 승인 표시
    expect(touchesUserData(read('00000000000020')).yes).toBe(true);
    expect(touchesUserData(read('00000000000022')).yes).toBe(true);
  });

  it('🔴 승인 표시만 있어도(UPDATE 가 없어도) 요구한다', () => {
    const sql = `-- 🔴 이 마이그레이션은 승인 필수\ncreate table x(id int);`;
    const c = touchesUserData(sql);
    expect(c.update).toBe(0);
    expect(c.marked).toBe(true);
    expect(c.yes).toBe(true);
  });
});

describe('함수 본문 안의 UPDATE 는 데이터 변경이 아니다', () => {
  it('$$ 본문을 제거한다', () => {
    const sql = `
create or replace function f() returns void as $$
begin
  update public.users set credit_balance = 0;
end;
$$ language plpgsql;`;
    expect(summarize(sql).update).toBe(0);
    expect(touchesUserData(sql).yes).toBe(false);
  });

  it('$tag$ 본문도 제거한다', () => {
    const sql = `
create or replace function f() returns void as $body$
  update public.users set credit_balance = 0;
$body$ language sql;`;
    expect(summarize(sql).update).toBe(0);
  });

  it('본문 밖의 UPDATE 는 그대로 센다 (함수 + 백필이 같은 파일에 있을 때)', () => {
    const sql = `
create or replace function f() returns void as $$
  update public.a set x = 1;
$$ language sql;

update public.users set nickname = '무명' where nickname is null;`;
    expect(summarize(sql).update).toBe(1);
    expect(touchesUserData(sql).yes).toBe(true);
  });

  it('여러 함수가 있어도 각 본문만 정확히 지운다', () => {
    const sql = `
create or replace function a() returns void as $$ update t set x=1; $$ language sql;
update public.real set y = 2;
create or replace function b() returns void as $$ update t set x=1; $$ language sql;`;
    expect(summarize(sql).update).toBe(1);
    expect(stripFunctionBodies(sql)).not.toContain('update t');
    expect(stripFunctionBodies(sql)).toContain('update public.real');
  });
});

describe('실제 마이그레이션의 UPDATE 건수', () => {
  it('20 은 백필 2건, 22 는 정리 3건이다', () => {
    // 숫자가 늘면 그 파일이 예상보다 많은 데이터를 건드린다는 뜻이다.
    expect(summarize(read('00000000000020')).update).toBe(2);
    expect(summarize(read('00000000000022')).update).toBe(3);
  });

  it('어떤 마이그레이션에도 DROP TABLE / DELETE FROM 이 없다', () => {
    for (const f of readdirSync(DIR).filter((f) => f.endsWith('.sql'))) {
      const s = summarize(readFileSync(join(DIR, f), 'utf8'));
      expect(s.dropTable, `${f} 에 DROP TABLE`).toBe(0);
      expect(s.deleteFrom, `${f} 에 DELETE FROM`).toBe(0);
    }
  });
});

/**
 * 토큰 자리표시자 감지.
 *
 * 2026-08-16 에 두 번 — `발급받은_토큰`, `sbp_...` — 안내 문서의 자리표시자가
 * 그대로 실행됐다. 당시 검증이 `startsWith('sbp_')` 뿐이라 `sbp_...` 가 통과했고,
 * Management API 가 "JWT could not be decoded" 라는 원인 불명 에러를 돌려줬다.
 * 자리표시자는 **API 에 보내기 전에** 잡아야 한다.
 */
describe('토큰 자리표시자 감지', () => {
  it('실제로 발생했던 자리표시자를 거부한다', () => {
    for (const bad of ['sbp_...', '발급받은_토큰', 'sbp_여기에실제토큰', '']) {
      expect(looksLikeToken(bad), `${bad} 를 통과시켰다`).toBe(false);
    }
  });

  it('값이 없는 경우도 거부한다', () => {
    expect(looksLikeToken(undefined)).toBe(false);
    expect(looksLikeToken(null)).toBe(false);
  });

  it('토큰 형태(sbp_ + 40자리 영숫자)는 통과시킨다', () => {
    expect(looksLikeToken(`sbp_${'a1b2c3d4e5'.repeat(4)}`)).toBe(true);
  });

  it('앞뒤 공백은 허용한다 (셸 복사 시 흔하다)', () => {
    expect(looksLikeToken(`  sbp_${'0f'.repeat(20)}\n`)).toBe(true);
  });
});

