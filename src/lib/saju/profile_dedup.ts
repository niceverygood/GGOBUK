import type { createServerClient } from '@/lib/supabase/server';
import type { SajuProfileRow } from '@/types/db';

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * 중복 등록 방지를 위한 "같은 사람" 식별 키.
 * 이름·생년월일시·음양력·윤달·성별·관계가 모두 같으면 동일 인물로 본다.
 * birth_time 은 nullable 이라 null 비교는 .is() 로 처리해야 한다.
 */
export interface ProfileIdentity {
  name: string;
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
  is_leap_month: boolean;
  gender: 'M' | 'F';
  relation_type: string;
}

/**
 * owner_id 범위 안에서 동일 인물 프로필이 이미 있으면 그 행을 돌려준다.
 * 없으면 null. 호출부는 이 결과로 insert 를 건너뛰고 기존 행을 재사용해
 * "한 번 등록했는데 여러 개 생기는" 중복을 막는다.
 *
 * 주의: select-then-insert 라 완전 동시 요청(같은 ms)에는 경합 여지가 있다.
 * 실사용 트리거(더블탭·느린 네트워크 재시도·compat 실패 후 재등록)는 순차라
 * 이 검사로 충분히 막힌다. 완전 차단은 DB 부분 유니크 인덱스가 필요(후속).
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
    .eq('name', identity.name)
    .eq('birth_date', identity.birth_date)
    .eq('is_lunar', identity.is_lunar)
    .eq('is_leap_month', identity.is_leap_month)
    .eq('gender', identity.gender)
    .eq('relation_type', identity.relation_type);

  query =
    identity.birth_time === null
      ? query.is('birth_time', null)
      : query.eq('birth_time', identity.birth_time);

  const { data } = await query
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<SajuProfileRow>();

  return data ?? null;
}
