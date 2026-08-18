import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `/api/profiles` POST 통합 테스트 — **실제 라우트 핸들러를 호출한다.**
 *
 * 여기서 지키는 것은 하나다: 동일 인물 insert 가 DB unique 인덱스에 걸렸을 때
 * **사용자에게 500 이 나가지 않는다.**
 *
 * 2026-08-16 이전에는 이 경로가 `error.message` 를 그대로 500 으로 뱉었다.
 * migration 22 가 unique 인덱스를 걸면서 실제로 밟히는 경로가 됐다.
 */

const resolveMock = vi.fn();
vi.mock('@/lib/profiles/resolve', () => ({
  resolveRepresentativeProfile: (...a: unknown[]) => resolveMock(...a),
}));

const createServerClientMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: (...a: unknown[]) => createServerClientMock(...a),
}));

const { POST } = await import('@/app/api/profiles/route');

type Row = Record<string, unknown>;

/** 필요한 만큼만 흉내 낸 Supabase 클라이언트. */
function makeSupabase(opts: {
  userId?: string | null;
  /** findDuplicateProfile 이 호출될 때마다 순서대로 돌려줄 후보 목록 */
  lookups: Row[][];
  insert: { data: Row | null; error: { code: string; message: string } | null };
}) {
  const calls = { lookups: 0, inserts: 0, relationUpserts: 0 };

  const table = () => {
    const q: Record<string, unknown> = {};
    Object.assign(q, {
      select: () => q,
      eq: () => q,
      is: () => q,
      order: () => q,
      returns: () => {
        const rows = opts.lookups[calls.lookups] ?? [];
        calls.lookups += 1;
        return Promise.resolve({ data: rows, error: null });
      },
      insert: () => {
        calls.inserts += 1;
        return {
          select: () => ({ single: () => Promise.resolve(opts.insert) }),
        };
      },
      upsert: () => {
        calls.relationUpserts += 1;
        return Promise.resolve({ error: null });
      },
    });
    return q;
  };

  const client = {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: opts.userId ? { id: opts.userId } : null },
        }),
    },
    from: () => table(),
  };
  return { client, calls };
}

const BODY = {
  name: '홍길동',
  birthDate: '1990-01-01',
  birthTime: '10:30',
  isLunar: false,
  isLeapMonth: false,
  gender: 'M',
  relationType: 'friend',
};

const req = (body: unknown = BODY) =>
  new Request('http://localhost/api/profiles', {
    method: 'POST',
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  resolveMock.mockResolvedValue({ ok: false, reason: 'no_profile' });
});

describe('POST /api/profiles — 동일 인물 충돌', () => {
  it('DB 가 23505 로 거부해도 500 이 아니라 기존 행을 돌려준다', async () => {
    // 사전 조회는 비어 있고(=중복 아님으로 판정) insert 에서 경합에 진 상황.
    const { client, calls } = makeSupabase({
      userId: 'u1',
      lookups: [[], [{ id: 'winner', name: '홍길동' }]],
      insert: {
        data: null,
        error: {
          code: '23505',
          message:
            'duplicate key value violates unique constraint "saju_profiles_identity_uniq"',
        },
      },
    });
    createServerClientMock.mockResolvedValue(client);

    const res = await POST(req());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ profile: { id: 'winner', name: '홍길동' }, deduped: true });
    expect(calls.inserts).toBe(1);
    expect(calls.lookups).toBe(2); // 사전 조회 + 충돌 후 재조회
  });

  it('충돌 응답에 Postgres 원문 메시지를 노출하지 않는다', async () => {
    const { client } = makeSupabase({
      userId: 'u1',
      lookups: [[], [{ id: 'winner', name: '홍길동' }]],
      insert: {
        data: null,
        error: { code: '23505', message: 'duplicate key ... saju_profiles_identity_uniq' },
      },
    });
    createServerClientMock.mockResolvedValue(client);

    const body = JSON.stringify(await (await POST(req())).json());
    expect(body).not.toContain('duplicate key');
    expect(body).not.toContain('saju_profiles_identity_uniq');
  });

  it('관계 유형이 달라도 사전 조회에서 걸러 insert 를 시도조차 않는다', async () => {
    // relation_type='friend' 로 보내지만 기존 행은 'self' — 같은 사람이다.
    const { client, calls } = makeSupabase({
      userId: 'u1',
      lookups: [[{ id: 'existing', name: '홍길동', relation_type: 'self' }]],
      insert: { data: null, error: null },
    });
    createServerClientMock.mockResolvedValue(client);

    const json = await (await POST(req())).json();
    expect(json.deduped).toBe(true);
    expect(json.profile.id).toBe('existing');
    expect(calls.inserts).toBe(0);
  });

  it('이름 표기만 다른 경우도 같은 사람으로 본다', async () => {
    const { client, calls } = makeSupabase({
      userId: 'u1',
      lookups: [[{ id: 'existing', name: '홍 길동' }]],
      insert: { data: null, error: null },
    });
    createServerClientMock.mockResolvedValue(client);

    const json = await (await POST(req())).json();
    expect(json.profile.id).toBe('existing');
    expect(calls.inserts).toBe(0);
  });
});

describe('POST /api/profiles — 정상 경로가 깨지지 않았다', () => {
  it('진짜 새 사람은 그대로 생성한다', async () => {
    const { client, calls } = makeSupabase({
      userId: 'u1',
      lookups: [[{ id: 'other', name: '김철수' }]], // 생일은 같지만 다른 사람
      insert: { data: { id: 'new', name: '홍길동' }, error: null },
    });
    createServerClientMock.mockResolvedValue(client);

    const res = await POST(req());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ profile: { id: 'new', name: '홍길동' } });
    expect(calls.inserts).toBe(1);
  });

  it('23505 가 아닌 오류는 그대로 500 으로 올린다', async () => {
    const { client } = makeSupabase({
      userId: 'u1',
      lookups: [[]],
      insert: { data: null, error: { code: '23503', message: 'fk violation' } },
    });
    createServerClientMock.mockResolvedValue(client);

    expect((await POST(req())).status).toBe(500);
  });

  it('비로그인은 401', async () => {
    const { client } = makeSupabase({
      userId: null,
      lookups: [[]],
      insert: { data: null, error: null },
    });
    createServerClientMock.mockResolvedValue(client);

    expect((await POST(req())).status).toBe(401);
  });

  it('잘못된 본문은 400', async () => {
    const { client } = makeSupabase({
      userId: 'u1',
      lookups: [[]],
      insert: { data: null, error: null },
    });
    createServerClientMock.mockResolvedValue(client);

    expect((await POST(req({ name: '' }))).status).toBe(400);
  });
});
