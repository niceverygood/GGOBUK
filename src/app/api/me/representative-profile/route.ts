import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import {
  listActiveProfiles,
  setRepresentativeProfile,
} from '@/lib/profiles/resolve';

export const runtime = 'nodejs';

const Body = z.object({
  profileId: z.string().uuid(),
});

/** 대표프로필 후보 목록 + 현재 대표. 대표 선택 dialog 가 쓴다. */
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { profiles, representativeId } = await listActiveProfiles(
    supabase,
    user.id,
  );

  // 필요한 필드만 노출한다 (users.* 를 그대로 흘리지 않는 원칙과 동일).
  return NextResponse.json({
    representativeId,
    profiles: profiles.map((p) => ({
      id: p.id,
      name: p.name,
      relationType: p.relation_type,
      relationLabel: p.relation_label,
      birthDate: p.birth_date,
      birthTime: p.birth_time,
      isLunar: p.is_lunar,
      gender: p.gender,
    })),
  });
}

/**
 * 대표프로필 지정.
 *
 * 다른 사용자의 UUID·삭제된 프로필·존재하지 않는 UUID 는 전부 404 로 수렴시켜
 * 내부 존재 여부를 과도하게 노출하지 않는다. malformed UUID 만 400.
 */
export async function PATCH(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_profile_id' }, { status: 400 });
  }

  const admin = await createServerClient({ admin: true });
  const result = await setRepresentativeProfile({
    supabase,
    admin,
    userId: user.id,
    profileId: body.profileId,
  });

  if (!result.ok) {
    if (result.reason === 'not_found') {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({
    representativeId: result.profile.id,
    profile: {
      id: result.profile.id,
      name: result.profile.name,
      relationType: result.profile.relation_type,
      birthDate: result.profile.birth_date,
    },
  });
}
