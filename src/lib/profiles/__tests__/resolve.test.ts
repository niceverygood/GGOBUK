import { describe, expect, it, vi } from 'vitest';
import {
  listActiveProfiles,
  resolveRepresentativeProfile,
  setRepresentativeProfile,
} from '@/lib/profiles/resolve';

/**
 * 대표프로필 해석 규칙 테스트.
 *
 * Supabase 쿼리 빌더를 최소한으로 흉내 낸다 — 체이닝 메서드는 자기 자신을 돌려주고
 * 종결자(`maybeSingle`/`returns`)에서 준비된 응답을 낸다.
 */
type Row = Record<string, unknown>;

function makeClient(handlers: {
  users?: Row | null;
  /** eq('id', X) 로 조회되는 프로필 (대표 포인터 검증용) */
  byId?: Row | null;
  /** relation_type='self' 폴백 결과 */
  self?: Row[];
  /** 전체 폴백 결과 */
  any?: Row[];
  updateError?: { message: string } | null;
}) {
  const updateSpy = vi.fn();

  const makeProfileQuery = () => {
    const state = { hasIdEq: false, hasSelfEq: false };
    const q: Record<string, unknown> = {};
    const chain = (fn?: (k: string, v: unknown) => void) =>
      (k: string, v: unknown) => {
        fn?.(k, v);
        return q;
      };
    Object.assign(q, {
      select: () => q,
      eq: chain((k, v) => {
        if (k === 'id') state.hasIdEq = true;
        if (k === 'relation_type' && v === 'self') state.hasSelfEq = true;
      }),
      or: () => q,
      is: () => q,
      order: () => q,
      limit: () => q,
      maybeSingle: async () => ({ data: handlers.byId ?? null }),
      returns: () => q,
      then: undefined,
    });
    // 폴백 경로는 await 로 배열을 받는다.
    (q as { then: unknown }).then = (resolve: (v: unknown) => void) =>
      resolve({
        data: state.hasSelfEq ? (handlers.self ?? []) : (handlers.any ?? []),
      });
    return q;
  };

  const usersQuery = () => {
    const q: Record<string, unknown> = {};
    Object.assign(q, {
      select: () => q,
      eq: () => q,
      not: () => q,
      returns: () => q,
      maybeSingle: async () => ({ data: handlers.users ?? null }),
      update: (payload: Row) => {
        updateSpy(payload);
        return {
          eq: async () => ({ error: handlers.updateError ?? null }),
        };
      },
    });
    return q;
  };

  return {
    client: {
      from: (table: string) =>
        table === 'users' ? usersQuery() : makeProfileQuery(),
    } as never,
    updateSpy,
  };
}

const REP = { id: 'rep-1', owner_id: 'u1', name: '나', relation_type: 'self' };
const SELF_OLD = { id: 'self-old', owner_id: 'u1', name: '나(구)', relation_type: 'self' };
const OTHER = { id: 'other-1', owner_id: 'u1', name: '엄마', relation_type: 'family' };

describe('resolveRepresentativeProfile', () => {
  it('대표 포인터가 있으면 그 프로필을 쓴다', async () => {
    const { client } = makeClient({
      users: { representative_profile_id: 'rep-1' },
      byId: REP,
    });
    const r = await resolveRepresentativeProfile(client, 'u1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.id).toBe('rep-1');
      expect(r.source).toBe('representative');
    }
  });

  it('포인터가 없으면 self 중 최초 생성으로 폴백한다', async () => {
    const { client } = makeClient({
      users: { representative_profile_id: null },
      self: [SELF_OLD],
    });
    const r = await resolveRepresentativeProfile(client, 'u1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile.id).toBe('self-old');
      expect(r.source).toBe('fallback');
    }
  });

  it('self 가 없으면 전체 중 최초 생성으로 폴백한다', async () => {
    const { client } = makeClient({
      users: { representative_profile_id: null },
      self: [],
      any: [OTHER],
    });
    const r = await resolveRepresentativeProfile(client, 'u1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile.id).toBe('other-1');
  });

  it('포인터가 가리키는 프로필이 사라졌으면 폴백한다', async () => {
    const { client } = makeClient({
      users: { representative_profile_id: 'deleted-1' },
      byId: null, // 조회 실패
      self: [SELF_OLD],
    });
    const r = await resolveRepresentativeProfile(client, 'u1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profile.id).toBe('self-old');
  });

  it('프로필이 하나도 없으면 no_profile', async () => {
    const { client } = makeClient({
      users: { representative_profile_id: null },
      self: [],
      any: [],
    });
    const r = await resolveRepresentativeProfile(client, 'u1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_profile');
  });
});

describe('listActiveProfiles', () => {
  it('대표를 맨 앞으로 정렬한다', async () => {
    const { client } = makeClient({
      users: { representative_profile_id: 'other-1' },
      any: [SELF_OLD, OTHER],
    });
    const { profiles, representativeId } = await listActiveProfiles(client, 'u1');
    expect(representativeId).toBe('other-1');
    expect(profiles[0].id).toBe('other-1');
  });
});

describe('setRepresentativeProfile', () => {
  it('본인 소유 프로필이면 지정한다', async () => {
    const { client, updateSpy } = makeClient({ byId: REP });
    const r = await setRepresentativeProfile({
      supabase: client,
      admin: client,
      userId: 'u1',
      profileId: 'rep-1',
    });
    expect(r.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ representative_profile_id: 'rep-1' });
  });

  it('남의 프로필/삭제된 프로필은 not_found 로 수렴한다', async () => {
    const { client, updateSpy } = makeClient({ byId: null });
    const r = await setRepresentativeProfile({
      supabase: client,
      admin: client,
      userId: 'u1',
      profileId: 'someone-elses',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_found');
    // 소유권 검증 실패 시 쓰기를 시도조차 하지 않는다.
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('쓰기 실패는 write_failed 로 구분한다', async () => {
    const { client } = makeClient({ byId: REP, updateError: { message: 'boom' } });
    const r = await setRepresentativeProfile({
      supabase: client,
      admin: client,
      userId: 'u1',
      profileId: 'rep-1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('write_failed');
  });
});
