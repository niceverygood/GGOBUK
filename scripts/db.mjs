#!/usr/bin/env node
/**
 * Supabase 프로덕션 DB 운영 CLI (Management API 경유).
 *
 *   pnpm db:status              적용된 마이그레이션 실측 (repo vs 라이브 드리프트)
 *   pnpm db:verify              보안 불변식을 **라이브 DB 에서** 검증
 *   pnpm db:apply <번호|파일>    마이그레이션 하나 적용 (--yes 필요)
 *   pnpm db:query "<sql>"       읽기 전용 조회
 *
 * ⚠️ 토큰(SUPABASE_PAT)은 환경변수 또는 **gitignore 된 .env.local** 에서만 받는다.
 *    코드·저장소·문서·로그에 넣지 않는다. 값을 화면에 출력하지도 않는다.
 *    https://supabase.com/dashboard/account/tokens 에서 발급.
 *    계정 전체 권한이므로 작업이 끝나면 폐기(Revoke)할 것.
 *
 * 왜 이 도구가 필요한가
 *  - `src/lib/db/__tests__/migration-security.test.ts` 는 **SQL 파일**만 검사한다.
 *    파일이 옳아도 **라이브 DB 에 적용됐는지**는 알 수 없다. `db:verify` 가 그 간극을 메운다.
 *  - `CLAUDE.md` 에 기록된 스키마 드리프트(2026-06-10, mig 5·9·11·12·13·16 누락) 재발 방지.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

// ─── 설정 ────────────────────────────────────────────────────────────────────

/** `.env.local` 에서 키 하나를 읽는다. **값은 절대 출력하지 않는다.** */
function envLocal(key) {
  try {
    const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
    const m = env.match(
      new RegExp(`^\\s*${key}\\s*=\\s*["']?([^"'\\s#]+)`, 'm'),
    );
    return m?.[1];
  } catch {
    return undefined; // .env.local 이 없으면 호출부가 env 로 폴백한다
  }
}

function projectRef() {
  const url = envLocal('NEXT_PUBLIC_SUPABASE_URL');
  const m = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (m) return m[1];
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  fail(
    'project ref 를 찾지 못했다. .env.local 의 NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_PROJECT_REF 를 설정하라.',
  );
}

const SETUP_HINT =
  '  해결:\n' +
  '    1) https://supabase.com/dashboard/account/tokens 에서 토큰 발급\n' +
  '    2) .env.local 에 아래 한 줄 추가 (gitignore 됨. 한 번만 하면 된다)\n' +
  '         SUPABASE_PAT=sbp_여기에실제토큰\n' +
  '  ⚠️ 계정 전체 권한이다. 작업이 끝나면 Revoke 하고 이 줄을 지워라.';

/**
 * 토큰을 찾는다. 우선순위: 환경변수 → `.env.local`.
 *
 * `.env.local` 을 폴백으로 두는 이유 — 매번 `export` 하게 만들면 안내 문서의
 * `sbp_...` 같은 **자리표시자를 그대로 붙여넣는 사고**가 반복된다(2026-08-16, 2회).
 * 한 번 적어두면 그 뒤로는 `pnpm db:verify` 만 치면 된다.
 */
/** 토큰처럼 생겼는가. 자리표시자를 걸러내기 위한 것 — 유효성 검사가 아니다. */
export function looksLikeToken(t) {
  return typeof t === 'string' && /^sbp_[a-z0-9]{20,}$/i.test(t.trim());
}

function token() {
  const t = process.env.SUPABASE_PAT?.trim() || envLocal('SUPABASE_PAT');
  if (!t) fail(`SUPABASE_PAT 를 찾지 못했다 (환경변수·.env.local 둘 다 없음).\n${SETUP_HINT}`);

  // ⚠️ 자리표시자를 여기서 잡아야 한다. 통과시키면 Management API 가
  //    "JWT could not be decoded" 라는, 원인을 알 수 없는 에러를 돌려준다.
  if (!looksLikeToken(t)) {
    fail(
      '토큰이 아니라 **자리표시자**를 넣은 것 같다.\n' +
        `  받은 값의 형태: ${t.slice(0, 4)}${'*'.repeat(Math.max(0, Math.min(t.length - 4, 8)))} (길이 ${t.length})\n` +
        '  실제 토큰은 sbp_ 뒤에 40자리 영숫자가 붙는다.\n' +
        SETUP_HINT,
    );
  }
  return t;
}

// ─── 실행 ────────────────────────────────────────────────────────────────────

async function runSql(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef()}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    fail(`응답을 파싱하지 못했다 (HTTP ${res.status}): ${text.slice(0, 400)}`);
  }

  if (!res.ok || body?.message) {
    // 토큰 값이 메시지에 섞여 나올 일은 없지만, 원문을 그대로 흘리지 않는다.
    const msg = String(body?.message ?? `HTTP ${res.status}`);
    fail(`SQL 실행 실패:\n  ${msg.trim()}`);
  }
  return body;
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function table(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '  (결과 없음)';
  return rows
    .map((r) =>
      Object.entries(r)
        .map(([k, v]) => `  ${k.padEnd(30)} ${v === null ? 'null' : v}`)
        .join('\n'),
    )
    .join('\n  ---\n');
}

// ─── 마이그레이션 파일 ────────────────────────────────────────────────────────

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function resolveMigration(arg) {
  const files = migrationFiles();
  // 번호(예: 22) 또는 파일명 일부로 찾는다.
  const hit = files.filter(
    (f) => f.includes(arg) || f.startsWith(String(arg).padStart(14, '0')),
  );
  if (hit.length === 0) fail(`마이그레이션을 찾지 못했다: ${arg}`);
  if (hit.length > 1) fail(`여러 개가 일치한다: ${hit.join(', ')}`);
  return hit[0];
}

/** 주석을 제외한 실제 구문의 종류를 센다 — 적용 전에 무엇을 하는지 보여주기 위함. */
/** `$$ … $$` / `$tag$ … $tag$` 로 감싼 함수 본문을 지운다. */
export function stripFunctionBodies(code) {
  return code.replace(/\$([a-z_]*)\$[\s\S]*?\$\1\$/g, '$$$$BODY$$$$');
}

export function summarize(sql) {
  const code = sql
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n')
    .toLowerCase();
  // ⚠️ 함수 본문 안의 UPDATE/DELETE 는 **정의를 저장할 뿐 데이터를 바꾸지 않는다.**
  //    그대로 세면 RPC 를 만드는 마이그레이션이 전부 "데이터 변경"으로 잡혀
  //    경고가 일상이 되고, 결국 사람이 경고를 읽지 않게 된다 → 게이트가 무력해진다.
  const top = stripFunctionBodies(code);
  const count = (re) => (top.match(re) ?? []).length;
  return {
    createTable: count(/create table/g),
    alterTable: count(/alter table/g),
    createFunction: count(/create or replace function/g),
    createIndex: count(/create (unique )?index/g),
    dropIndex: count(/drop index/g),
    policy: count(/create policy/g),
    grantRevoke: count(/\b(grant|revoke)\b/g),
    update: count(/^\s*update /gm),
    deleteFrom: count(/delete from/g),
    dropTable: count(/drop table/g),
  };
}

/**
 * 이 마이그레이션이 **기존 사용자 데이터를 건드리는가**.
 *
 * 스키마 추가(테이블·컬럼·인덱스·RPC·권한)는 되돌리기 쉽고 기존 행을 바꾸지 않는다.
 * 반면 top-level UPDATE/DELETE 는 사람 데이터를 고친다 — 다른 게이트가 필요하다.
 */
export function touchesUserData(sql) {
  const s = summarize(sql);
  return {
    marked: /🔴[^\n]*승인/.test(sql),
    update: s.update,
    deleteFrom: s.deleteFrom,
    get yes() {
      return this.marked || this.update > 0 || this.deleteFrom > 0;
    },
  };
}

// ─── 명령: status ────────────────────────────────────────────────────────────

const PROBES = {
  '00000000000018': `to_regclass('public.bread_opens') is not null`,
  '00000000000019': `not has_table_privilege('authenticated','public.users','UPDATE')`,
  '00000000000020': `exists(select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='representative_profile_id')`,
  '00000000000021': `to_regclass('public.reports') is not null`,
  '00000000000022': `exists(select 1 from pg_indexes where schemaname='public' and indexname='saju_profiles_identity_uniq')`,
};

async function cmdStatus() {
  const files = migrationFiles();
  const probes = Object.entries(PROBES);
  const sql = `select ${probes
    .map(([n, expr]) => `(${expr}) as "m${n.slice(-2)}"`)
    .join(', ')}`;
  const [row] = await runSql(sql);

  console.log('\n마이그레이션 적용 상태 (라이브 실측)\n');
  for (const f of files) {
    const num = f.slice(0, 14);
    const key = `m${num.slice(-2)}`;
    const known = key in row;
    const mark = !known ? '·  (프로브 없음)' : row[key] ? '✅ 적용됨' : '❌ 미적용';
    console.log(`  ${mark.padEnd(18)} ${f}`);
  }
  console.log(
    '\n  ⚠️ 프로브가 없는 마이그레이션(1~17)은 이 도구로 확인하지 않는다.\n' +
      '     새 마이그레이션을 추가하면 scripts/db.mjs 의 PROBES 에 판별식을 넣어라.\n',
  );
}

// ─── 명령: verify — 라이브 보안 불변식 ────────────────────────────────────────

const INVARIANTS = [
  {
    name: 'users 광범위 UPDATE 차단',
    sql: `select not has_table_privilege('authenticated','public.users','UPDATE') as ok`,
    why: '열려 있으면 사용자가 REST 로 자기 credit_balance·is_admin 을 직접 바꿀 수 있다',
  },
  {
    name: 'credit_balance 직접 수정 불가',
    sql: `select not has_column_privilege('authenticated','public.users','credit_balance','UPDATE') as ok`,
    why: '재화 무단 발행',
  },
  {
    name: 'is_admin 직접 수정 불가',
    sql: `select not has_column_privilege('authenticated','public.users','is_admin','UPDATE') as ok`,
    why: '관리자 권한 상승',
  },
  {
    name: 'nickname 은 수정 가능 (기능 유지)',
    sql: `select has_column_privilege('authenticated','public.users','nickname','UPDATE') as ok`,
    why: '너무 조여서 정상 기능이 깨지지 않았는지',
  },
  {
    name: 'push 설정은 수정 가능 (기능 유지)',
    sql: `select has_column_privilege('authenticated','public.users','push_enabled','UPDATE') as ok`,
    why: '/api/me/push 가 동작해야 한다',
  },
  {
    name: 'usage_logs 변조 차단',
    sql: `select not has_table_privilege('authenticated','public.usage_logs','UPDATE') as ok`,
    why: '무료 사용량 카운터를 리셋해 한도를 무한화',
  },
  {
    name: 'interpretations 직접 INSERT 차단',
    sql: `select not has_table_privilege('authenticated','public.interpretations','INSERT') as ok`,
    why: '유료 풀이를 직접 만들어 페이월 우회',
  },
  {
    name: 'daily_fortunes 직접 쓰기 차단',
    sql: `select not has_table_privilege('authenticated','public.daily_fortunes','INSERT') as ok`,
    why: '결과 위조',
  },
  {
    name: 'users 직접 INSERT 차단',
    sql: `select not has_table_privilege('authenticated','public.users','INSERT') as ok`,
    why: '신규 행에 credit_balance 를 실어 만들 수 있다',
  },
  {
    name: 'open_bread 인자는 p_user_id 하나뿐',
    sql: `select coalesce((select pg_get_function_identity_arguments(oid) from pg_proc where proname='open_bread' limit 1),'(없음)') = 'p_user_id uuid' as ok`,
    why: '경제 파라미터를 인자로 받으면 임의 재화 발행이 가능',
  },
  {
    name: 'increment_chat_usage 가 KST 를 쓴다',
    sql: `select coalesce((select prosrc like '%Asia/Seoul%' from pg_proc where proname='increment_chat_usage' limit 1), false) as ok`,
    why: 'UTC 면 KST 00~09 시 사용량이 다른 날짜에 쌓여 무료 한도가 샌다',
  },
  {
    name: 'increment_chat_usage 가 호출자를 검증한다',
    sql: `select coalesce((select prosrc like '%auth.uid()%' from pg_proc where proname='increment_chat_usage' limit 1), false) as ok`,
    why: '타인의 무료 한도를 소진시킬 수 있다',
  },
  {
    name: '대표프로필 소유권 FK 존재',
    sql: `select exists(select 1 from pg_constraint where conname='users_representative_owned_fk') as ok`,
    why: '남의 프로필을 대표로 지정할 수 있다',
  },
  {
    name: '대표프로필 백필 누락 없음',
    sql: `select not exists(select 1 from public.users u where u.representative_profile_id is null and exists(select 1 from public.saju_profiles p where p.owner_id = u.id and p.deleted_at is null)) as ok`,
    why: '프로필이 있는데 대표가 없으면 홈에서 온보딩으로 튕긴다',
  },
];

async function cmdVerify() {
  console.log('\n라이브 DB 보안 불변식 검증\n');
  const sql = `select ${INVARIANTS.map(
    (inv, i) => `(${inv.sql.replace(/^select /i, '').replace(/ as ok$/i, '')}) as "i${i}"`,
  ).join(', ')}`;

  const [row] = await runSql(sql);
  let failed = 0;

  INVARIANTS.forEach((inv, i) => {
    const ok = row[`i${i}`] === true;
    if (!ok) failed += 1;
    console.log(`  ${ok ? '✅' : '🔴'} ${inv.name}`);
    if (!ok) console.log(`      → ${inv.why}`);
  });

  console.log(
    `\n  ${INVARIANTS.length - failed}/${INVARIANTS.length} 통과` +
      (failed ? ` — 🔴 ${failed}건 실패\n` : '\n'),
  );
  if (failed) process.exit(1);
}

// ─── 명령: apply ─────────────────────────────────────────────────────────────

/**
 * 사람이 **직접 타이핑**해야만 통과하는 확인.
 *
 * 왜 플래그가 아니라 타이핑인가 — 2026-08-16 사고.
 * migration 22(사용자 데이터 변경, 승인 대기)가 `--yes` 하나로 프로덕션에 적용됐다.
 * 원인은 안내 문서의 코드블록에 `--yes` 가 들어 있었고 사용자가 블록을 통째로
 * 붙여넣은 것. **플래그는 복사·붙여넣기로 전파되지만 타이핑은 전파되지 않는다.**
 * 그래서 이 게이트만은 인자로 우회할 수 없게 만든다.
 */
async function confirmByTyping(expected, reason) {
  if (!process.stdin.isTTY) {
    fail(
      `${reason}\n` +
        '  이 마이그레이션은 사람이 직접 확인해야 한다. 대화형 터미널에서 실행하라.\n' +
        '  플래그로는 통과할 수 없다 — 붙여넣기 사고를 막기 위해 일부러 그렇게 만들었다.',
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\n  적용하려면 마이그레이션 번호 "${expected}" 를 직접 입력하라 (취소하려면 그냥 Enter): `,
  );
  rl.close();
  if (answer.trim() !== expected) {
    console.log('\n  취소했다. 아무것도 적용하지 않았다.\n');
    process.exit(1);
  }
}

async function cmdApply(arg, flags) {
  const file = resolveMigration(arg);
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  const s = summarize(sql);
  const num = String(Number(file.slice(0, 14)));

  console.log(`\n적용 대상: ${file}`);
  console.log('  이 파일이 하는 일:');
  for (const [k, v] of Object.entries(s)) {
    if (v > 0) console.log(`    ${k.padEnd(16)} ${v}`);
  }

  const destructive = s.dropTable > 0 || s.deleteFrom > 0;
  if (destructive && !flags.force) {
    fail(
      `이 파일에 DROP TABLE / DELETE FROM 이 있다 (dropTable=${s.dropTable}, deleteFrom=${s.deleteFrom}).\n` +
        '  데이터가 사라질 수 있다. 내용을 직접 확인한 뒤 --force 를 붙여라.',
    );
  }

  // 스키마 변경(additive)과 **사용자 데이터 변경**을 다르게 취급한다.
  // 후자는 파일 상단에 🔴 승인 표시가 있거나 UPDATE/DELETE 를 포함하는 경우다.
  const { marked, yes: touchesData } = touchesUserData(sql);

  if (!flags.yes) {
    console.log(
      touchesData
        ? '\n  ⚠️ 이 마이그레이션은 **사용자 데이터를 변경**한다.' +
            `${s.update ? ` (UPDATE ${s.update}건)` : ''}${marked ? ' 파일에 🔴 승인 필요 표시가 있다.' : ''}\n` +
            '     적용 전 파일 상단 PREFLIGHT 쿼리를 db:query 로 먼저 돌려 영향 범위를 실측하라.\n' +
            '     실제로 적용하려면 --yes 를 붙인 뒤, 번호를 직접 타이핑해 한 번 더 확인해야 한다.\n'
        : '\n  실제로 적용하려면 --yes 를 붙여라. (지금은 미리보기만 했다)\n',
    );
    return;
  }

  if (touchesData) {
    await confirmByTyping(
      num,
      `🔴 migration ${num} 은 사용자 데이터를 변경한다 — --yes 만으로는 적용하지 않는다.`,
    );
  }

  console.log('\n  적용 중...');
  await runSql(sql);
  console.log('  ✅ 적용 완료\n');

  console.log('  이어서 불변식을 검증한다:');
  await cmdVerify();
}

// ─── 명령: query ─────────────────────────────────────────────────────────────

async function cmdQuery(sql) {
  if (!sql) fail('SQL 을 넘겨라. 예: pnpm db:query "select count(*) from public.users"');
  const lowered = sql.toLowerCase();
  if (/\b(insert|update|delete|drop|truncate|alter|grant|revoke)\b/.test(lowered)) {
    fail('db:query 는 읽기 전용이다. 쓰기는 마이그레이션 파일로 만들어 db:apply 로 적용하라.');
  }
  console.log(table(await runSql(sql)));
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────
// 직접 실행할 때만 돈다. 테스트가 순수 함수만 import 할 수 있어야 하기 때문이다.

if (process.argv[1] !== fileURLToPath(import.meta.url)) {
  // 모듈로 import 된 경우 — 아래 CLI 디스패치를 건너뛴다.
} else {
const [, , cmd, ...rest] = process.argv;
const flags = {
  yes: rest.includes('--yes'),
  force: rest.includes('--force'),
};
const positional = rest.filter((a) => !a.startsWith('--'));

const commands = {
  status: () => cmdStatus(),
  verify: () => cmdVerify(),
  apply: () => cmdApply(positional[0], flags),
  query: () => cmdQuery(positional.join(' ')),
};

if (!cmd || !(cmd in commands)) {
  console.log(`
사용법:
  pnpm db:status              적용된 마이그레이션 실측
  pnpm db:verify              라이브 DB 보안 불변식 검증
  pnpm db:apply <번호> --yes   마이그레이션 적용 (--yes 없으면 미리보기)
  pnpm db:query "<sql>"       읽기 전용 조회

토큰: .env.local 에 SUPABASE_PAT=sbp_... 한 줄 (권장, gitignore 됨)
      또는 환경변수 SUPABASE_PAT
`);
  process.exit(cmd ? 1 : 0);
}

await commands[cmd]();
}
