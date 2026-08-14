import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildSajuProfilePayload } from '@/lib/saju/profile_payload';
import { findDuplicateProfile } from '@/lib/saju/profile_dedup';
import { createServerClient } from '@/lib/supabase/server';
import { resolveRepresentativeProfile } from '@/lib/profiles/resolve';
import type { SajuProfileRow } from '@/types/db';

const ProfileBody = z.object({
  name: z.string().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  isLunar: z.boolean(),
  isLeapMonth: z.boolean().optional().nullable(),
  gender: z.enum(['M', 'F']),
  relationType: z
    .enum(['self', 'family', 'friend', 'lover', 'colleague', 'other'])
    .default('other'),
  relationLabel: z.string().max(40).optional().nullable(),
});

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('saju_profiles')
    .select(
      'id, name, birth_date, birth_time, is_lunar, is_leap_month, gender, relation_type, relation_label, created_at, updated_at, ilgan, palja',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .returns<SajuProfileRow[]>();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const profiles = [...(data ?? [])].sort((a, b) => {
    if (a.relation_type === 'self') return -1;
    if (b.relation_type === 'self') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ profiles });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof ProfileBody>;
  try {
    body = ProfileBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_body', detail: String(e) },
      { status: 400 },
    );
  }

  // 관계(궁합) 엣지의 기준점 = 대표프로필. 예전엔 유일 self 를 기준으로 삼았다.
  const anchorResolved = await resolveRepresentativeProfile(supabase, user.id);
  const anchor = anchorResolved.ok ? anchorResolved.profile : null;

  // ⚠️ 다중 '본인' 허용 (Phase 1). 예전에는 self 가 이미 있으면 409 로 막았는데,
  //    한 사람이 "시간 아는 버전 / 모르는 버전"을 함께 두는 등 정당한 사례가 있다.
  //    대표 여부는 relation_type 이 아니라 users.representative_profile_id 가 정한다.
  const payload = buildSajuProfilePayload(body);

  // 같은 사람을 여러 번 등록하는 중복은 막는다(관계 유형 무관). 동일 인물 프로필이
  // 이미 있으면 새로 만들지 않고 기존 행을 재사용한다(멱등).
  // 경합은 migration 20 의 saju_profiles_identity_uniq 부분 unique 인덱스가 막는다.
  {
    const existing = await findDuplicateProfile(supabase, user.id, payload);
    if (existing) {
      if (anchor) {
        // 관계가 아직 없으면만 연결한다. ignoreDuplicates 로 기존 궁합 점수 보존.
        await supabase.from('relations').upsert(
          {
            user_id: user.id,
            saju_a_id: anchor.id,
            saju_b_id: existing.id,
            compatibility: null,
          },
          { onConflict: 'saju_a_id,saju_b_id', ignoreDuplicates: true },
        );
      }
      return NextResponse.json({ profile: existing, deduped: true });
    }
  }

  const { data: profile, error } = await supabase
    .from('saju_profiles')
    .insert({
      owner_id: user.id,
      ...payload,
    })
    .select()
    .single<SajuProfileRow>();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (anchor && profile.id !== anchor.id) {
    const { error: relationError } = await supabase.from('relations').upsert(
      {
        user_id: user.id,
        saju_a_id: anchor.id,
        saju_b_id: profile.id,
        compatibility: null,
      },
      { onConflict: 'saju_a_id,saju_b_id' },
    );

    if (relationError)
      return NextResponse.json(
        { error: relationError.message },
        { status: 500 },
      );
  }

  return NextResponse.json({ profile });
}
