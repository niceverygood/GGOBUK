import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const Body = z.object({
  persona: z.enum(['kkobuk', 'dosa', 'mudang', 'bosal']),
  saju_id: z.string().uuid().optional(),
  title: z.string().optional(),
});

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('id, persona, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = sessions ?? [];

  // 대화 리스트에 "무슨 얘기였는지" 주제를 노출하기 위해, 제목이 없는 세션은
  // 첫 사용자 메시지를 미리보기(preview)로 채운다. 세션 수는 사용자당 많지
  // 않아 병렬 단건 조회로 충분.
  const enriched = await Promise.all(
    list.map(async (s) => {
      if (s.title) return { ...s, preview: null as string | null };
      const { data: firstMsg } = await supabase
        .from('chat_messages')
        .select('content')
        .eq('session_id', s.id)
        .eq('role', 'user')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      const preview = firstMsg?.content
        ? firstMsg.content.replace(/\s+/g, ' ').trim().slice(0, 80)
        : null;
      return { ...s, preview };
    }),
  );

  return NextResponse.json({ sessions: enriched });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = Body.parse(await req.json());

  let sajuId = body.saju_id;
  if (!sajuId) {
    const { data: profile } = await supabase
      .from('saju_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .eq('relation_type', 'self')
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: 'no self profile' }, { status: 400 });
    sajuId = profile.id;
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      saju_id: sajuId,
      persona: body.persona,
      title: body.title ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
