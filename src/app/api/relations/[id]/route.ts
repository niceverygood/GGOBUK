import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const IdParam = z.string().uuid();

export async function DELETE(_req: Request, { params }: RouteContext) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: rawId } = await params;
  const parsed = IdParam.safeParse(rawId);
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const relationId = parsed.data;
  const { data: relation, error: relationError } = await supabase
    .from('relations')
    .select('id, saju_b_id')
    .eq('id', relationId)
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; saju_b_id: string }>();

  if (relationError)
    return NextResponse.json({ error: relationError.message }, { status: 500 });
  if (!relation)
    return NextResponse.json({ error: 'relation_not_found' }, { status: 404 });

  const { data: otherProfile } = await supabase
    .from('saju_profiles')
    .select('id, relation_type')
    .eq('id', relation.saju_b_id)
    .eq('owner_id', user.id)
    .maybeSingle<{ id: string; relation_type: string }>();

  const { error: deleteRelationError } = await supabase
    .from('relations')
    .delete()
    .eq('id', relation.id)
    .eq('user_id', user.id);

  if (deleteRelationError)
    return NextResponse.json(
      { error: deleteRelationError.message },
      { status: 500 },
    );

  let deletedProfile = false;
  if (otherProfile && otherProfile.relation_type !== 'self') {
    const { count } = await supabase
      .from('relations')
      .select('id', { count: 'exact', head: true })
      .or(`saju_a_id.eq.${otherProfile.id},saju_b_id.eq.${otherProfile.id}`)
      .eq('user_id', user.id);

    if ((count ?? 0) === 0) {
      const { error: deleteProfileError } = await supabase
        .from('saju_profiles')
        .delete()
        .eq('id', otherProfile.id)
        .eq('owner_id', user.id)
        .neq('relation_type', 'self');

      if (deleteProfileError)
        return NextResponse.json(
          { error: deleteProfileError.message },
          { status: 500 },
        );
      deletedProfile = true;
    }
  }

  return NextResponse.json({ ok: true, deletedProfile });
}
