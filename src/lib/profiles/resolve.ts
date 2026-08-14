import type { SupabaseClient } from '@supabase/supabase-js';
import type { SajuProfileRow } from '@/types/db';

/**
 * 대표프로필 해석 — `relation_type='self'` 를 유일 대표로 가정하던 코드를 대체한다.
 *
 * 왜 필요한가
 *  - 한 계정에 여러 사람을 등록할 수 있고, 그중 **여러 개가 `self` 일 수 있다**
 *    (본인 사주를 시간 아는 버전/모르는 버전으로 두 개 등록하는 등).
 *  - DB 에는 원래 `self` 유일 제약이 없었다. `.maybeSingle()` 로 조회하던 코드가
 *    행이 2개가 되는 순간 PGRST116 으로 깨진다.
 *  - 대표는 `users.representative_profile_id` 가 단일 진실이며, 소유권은
 *    복합 FK(`users_representative_owned_fk`, migration 20)가 DB 레벨에서 강제한다.
 *
 * 폴백 순서: 대표 포인터 → self 중 최초 생성 → 전체 중 최초 생성 → null
 * (migration 20 이 아직 적용되지 않은 환경에서도 동작해야 하므로 폴백을 남긴다.)
 */

export type ProfileResolution =
  | { ok: true; profile: SajuProfileRow; source: 'representative' | 'fallback' }
  | { ok: false; reason: 'no_profile' };

/**
 * ⚠️ 마이그레이션 전개 창(expand window) 대응.
 *
 * migration 20 이 아직 적용되지 않은 환경에서는 `users.representative_profile_id` 와
 * `saju_profiles.deleted_at` 이 **없다**. 그 상태에서 해당 컬럼을 참조하면 PostgREST 가
 * 400(42703 undefined_column)을 내고 `data` 가 null 이 되는데, 이를 "프로필 없음"으로
 * 오인하면 **기존 사용자 전원이 온보딩으로 튕긴다.**
 *
 * 그래서 컬럼 부재를 감지해 한 단계 낮은 쿼리로 자동 폴백한다.
 * 마이그레이션이 적용되면 첫 성공 시점부터 정상 경로만 탄다.
 */
function isMissingColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === '42703' ||
    /column .* does not exist|could not find the .* column/i.test(
      error.message ?? '',
    )
  );
}

/** deleted_at 컬럼이 있는 환경인지 (한 번 확인하면 프로세스 수명 동안 재사용) */
let softDeleteSupported: boolean | null = null;

/** 대표프로필 1건을 가져온다. 없으면 폴백 규칙을 따른다. */
export async function resolveRepresentativeProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileResolution> {
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('representative_profile_id')
    .eq('id', userId)
    .maybeSingle<{ representative_profile_id: string | null }>();

  // migration 20 미적용 환경 → 컬럼이 없다. 폴백 경로로 계속 진행한다.
  const repId = isMissingColumn(userErr)
    ? null
    : (userRow?.representative_profile_id ?? null);

  if (repId) {
    // owner_id 를 함께 조건에 넣어 IDOR 을 이중 방어한다(FK 가 이미 막지만 방어적으로).
    const { data } = await supabase
      .from('saju_profiles')
      .select('*')
      .eq('id', repId)
      .eq('owner_id', userId)
      .maybeSingle<SajuProfileRow>();
    if (data) return { ok: true, profile: data, source: 'representative' };
    // 포인터가 가리키는 프로필이 사라진 경우 → 폴백으로 진행
  }

  const fallback = await pickFallbackProfile(supabase, userId);
  return fallback
    ? { ok: true, profile: fallback, source: 'fallback' }
    : { ok: false, reason: 'no_profile' };
}

/** 대표가 없을 때 쓸 프로필: self 최초 생성 → 전체 최초 생성 */
async function pickFallbackProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<SajuProfileRow | null> {
  const run = async (withSoftDelete: boolean, selfOnly: boolean) => {
    let q = supabase
      .from('saju_profiles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);
    if (withSoftDelete) q = q.is('deleted_at', null);
    if (selfOnly) q = q.eq('relation_type', 'self');
    return q;
  };

  const attempt = async (selfOnly: boolean) => {
    if (softDeleteSupported !== false) {
      const { data, error } = await run(true, selfOnly);
      if (!isMissingColumn(error)) {
        softDeleteSupported = true;
        return (data?.[0] as SajuProfileRow | undefined) ?? null;
      }
      // 컬럼 부재 확정 → 이후 호출은 곧바로 낮은 경로로
      softDeleteSupported = false;
    }
    const { data } = await run(false, selfOnly);
    return (data?.[0] as SajuProfileRow | undefined) ?? null;
  };

  return (await attempt(true)) ?? (await attempt(false));
}

/**
 * 사용자의 활성 프로필 전체. 대표 선택 dialog·프로필 관리 화면용.
 * 대표가 맨 앞에 오도록 정렬한다.
 */
export async function listActiveProfiles(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profiles: SajuProfileRow[]; representativeId: string | null }> {
  const [{ data: userRow }, { data: rows }] = await Promise.all([
    supabase
      .from('users')
      .select('representative_profile_id')
      .eq('id', userId)
      .maybeSingle<{ representative_profile_id: string | null }>(),
    supabase
      .from('saju_profiles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .returns<SajuProfileRow[]>(),
  ]);

  const representativeId = userRow?.representative_profile_id ?? null;
  const profiles = rows ?? [];
  profiles.sort((a, b) => {
    if (a.id === representativeId) return -1;
    if (b.id === representativeId) return 1;
    return 0;
  });

  return { profiles, representativeId };
}

/**
 * 대표프로필을 지정한다. **소유권을 서버에서 재검증**한 뒤 admin client 로 쓴다.
 * (migration 19 가 authenticated 의 users UPDATE 를 컬럼 단위로 축소했고,
 *  representative_profile_id 는 허용 목록에 없다.)
 *
 * 반환: 성공 시 프로필, 실패 사유는 호출자가 HTTP 상태로 번역한다.
 */
export async function setRepresentativeProfile(params: {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  userId: string;
  profileId: string;
}): Promise<
  | { ok: true; profile: SajuProfileRow }
  | { ok: false; reason: 'not_found' | 'write_failed' }
> {
  const { supabase, admin, userId, profileId } = params;

  // 존재 + 본인 소유 + 미삭제. 셋 중 하나라도 아니면 존재 여부를 구분해 노출하지 않는다.
  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('owner_id', userId)
    .maybeSingle<SajuProfileRow>();
  if (!profile) return { ok: false, reason: 'not_found' };
  // soft delete 된 프로필은 대표가 될 수 없다 (컬럼이 없는 환경에서는 undefined → 통과)
  if ((profile as { deleted_at?: string | null }).deleted_at) {
    return { ok: false, reason: 'not_found' };
  }

  const { error } = await admin
    .from('users')
    .update({ representative_profile_id: profileId })
    .eq('id', userId);
  if (error) return { ok: false, reason: 'write_failed' };

  return { ok: true, profile };
}
