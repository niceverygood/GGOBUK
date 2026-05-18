import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildSajuProfilePayload } from '@/lib/saju/profile_payload';
import { createServerClient } from '@/lib/supabase/server';
import type { RelationType, SajuProfileRow } from '@/types/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const IdParam = z.string().uuid();

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
  relationType: z.enum([
    'self',
    'family',
    'friend',
    'lover',
    'colleague',
    'other',
  ]),
  relationLabel: z.string().max(40).optional().nullable(),
});

export const runtime = 'nodejs';

async function profileIdFromParams(params: RouteContext['params']) {
  const { id: rawId } = await params;
  const parsed = IdParam.safeParse(rawId);
  return parsed.success ? parsed.data : null;
}

async function clearStaleProfileData({
  profileId,
  userId,
  touchesSelf,
}: {
  profileId: string;
  userId: string;
  touchesSelf: boolean;
}) {
  const admin = await createServerClient({ admin: true });

  await Promise.all([
    admin.from('interpretations').delete().eq('saju_id', profileId),
    admin.from('daily_fortunes').delete().eq('saju_id', profileId),
    admin
      .from('timeline_feedback')
      .delete()
      .eq('user_id', userId)
      .eq('saju_id', profileId),
  ]);

  if (touchesSelf) {
    await admin
      .from('relations')
      .update({ compatibility: null })
      .eq('user_id', userId);
    return;
  }

  await admin
    .from('relations')
    .update({ compatibility: null })
    .eq('user_id', userId)
    .or(`saju_a_id.eq.${profileId},saju_b_id.eq.${profileId}`);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const profileId = await profileIdFromParams(params);
  if (!profileId)
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

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

  const { data: existing, error: existingError } = await supabase
    .from('saju_profiles')
    .select('id, relation_type')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .maybeSingle<{ id: string; relation_type: RelationType }>();

  if (existingError)
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing)
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });

  if (existing.relation_type === 'self' && body.relationType !== 'self') {
    return NextResponse.json({ error: 'self_locked' }, { status: 409 });
  }
  if (existing.relation_type !== 'self' && body.relationType === 'self') {
    return NextResponse.json({ error: 'self_reserved' }, { status: 409 });
  }

  const { data: profile, error } = await supabase
    .from('saju_profiles')
    .update(buildSajuProfilePayload(body))
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .select()
    .single<SajuProfileRow>();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await clearStaleProfileData({
    profileId,
    userId: user.id,
    touchesSelf: existing.relation_type === 'self',
  });

  return NextResponse.json({ profile });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const profileId = await profileIdFromParams(params);
  if (!profileId)
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: existing, error: existingError } = await supabase
    .from('saju_profiles')
    .select('id, relation_type')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .maybeSingle<{ id: string; relation_type: RelationType }>();

  if (existingError)
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing)
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });

  const { error } = await supabase
    .from('saju_profiles')
    .delete()
    .eq('id', profileId)
    .eq('owner_id', user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    deletedSelf: existing.relation_type === 'self',
  });
}
