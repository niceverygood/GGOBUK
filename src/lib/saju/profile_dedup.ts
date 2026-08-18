import type { createServerClient } from '@/lib/supabase/server';
import type { SajuProfileRow } from '@/types/db';

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * 중복 등록 방지를 위한 "같은 사람" 식별 키.
 *
 * ⚠️ **DB 의 `saju_profiles_identity_uniq` 인덱스와 기준이 정확히 같아야 한다.**
 * (migration 20 의 `identity_hash` + migration 22 의 unique 인덱스)
 * 기준이 어긋나면 앱은 "중복 아님"으로 판정해 insert 하고 DB 는 23505 로 거부한다
 * — 사용자에게는 원인 모를 500 이 된다. 2026-08-16 에 실제로 그 상태였다.
 *
 * DB 해시가 쓰는 것: owner_id · 정규화한 name · birth_date · birth_time ·
 *                   is_lunar · is_leap_month · gender
 * **relation_type 은 들어가지 않는다** — 같은 사람은 관계가 무엇이든 한 프로필이고,
 * 관계는 `relations` 테이블이 표현한다.
 */
export interface ProfileIdentity {
  name: string;
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
  is_leap_month: boolean;
  gender: 'M' | 'F';
  /** 식별에 쓰지 않는다. 호출부 payload 에 들어 있어 받아만 둔다. */
  relation_type?: string;
}

/**
 * DB 의 `lower(regexp_replace(coalesce(name,''), '\s+', '', 'g'))` 와 같은 정규화.
 * "홍 길동" 과 "홍길동" 은 같은 사람이다.
 */
export function normalizeProfileName(name: string | null | undefined): string {
  return (name ?? '').replace(/\s+/g, '').toLowerCase();
}

/** Postgres unique 위반. 동일 인물이 이미 있다는 뜻이다. */
export function isIdentityConflict(
  error: { code?: string | null } | null | undefined,
): boolean {
  return error?.code === '23505';
}

/**
 * owner_id 범위 안에서 동일 인물 프로필이 이미 있으면 그 행을 돌려준다. 없으면 null.
 * 호출부는 이 결과로 insert 를 건너뛰고 기존 행을 재사용한다(멱등).
 *
 * 이름 정규화는 PostgREST 로 표현할 수 없어 후보를 받아 JS 에서 비교한다.
 * 후보는 owner 당 생년월일·성별까지 같은 행뿐이라 사실상 0~2건이다.
 *
 * 경합(같은 ms 의 동시 요청)은 여기서 막지 못한다 — 그건 DB unique 인덱스가 막고,
 * 호출부가 `isIdentityConflict` 로 받아 기존 행을 돌려준다.
 */
export async function findDuplicateProfile(
  supabase: ServerClient,
  ownerId: string,
  identity: ProfileIdentity,
): Promise<SajuProfileRow | null> {
  let query = supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('birth_date', identity.birth_date)
    .eq('is_lunar', identity.is_lunar)
    .eq('is_leap_month', identity.is_leap_month)
    .eq('gender', identity.gender)
    // 정리된 프로필은 살아있는 후보가 아니다(migration 22).
    .is('deleted_at', null);

  query =
    identity.birth_time === null
      ? query.is('birth_time', null)
      : query.eq('birth_time', identity.birth_time);

  const { data } = await query
    .order('created_at', { ascending: true })
    .returns<SajuProfileRow[]>();

  const target = normalizeProfileName(identity.name);
  return (
    (data ?? []).find((row) => normalizeProfileName(row.name) === target) ?? null
  );
}
