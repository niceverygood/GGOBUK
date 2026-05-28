import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET — 동의 상태 조회. 클라이언트가 게이트를 띄울지 결정한다.
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ consented: false }, { status: 401 });

  const { data } = await supabase
    .from('users')
    .select('ai_consent_at')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    consented: !!data?.ai_consent_at,
    at: data?.ai_consent_at ?? null,
  });
}

// POST — 사용자가 '동의하고 시작' 누름. 타임스탬프 영구 기록.
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = await createServerClient({ admin: true });
  const { error } = await admin
    .from('users')
    .update({ ai_consent_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE — 사용자가 동의 철회. 기록 삭제.
export async function DELETE() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = await createServerClient({ admin: true });
  const { error } = await admin
    .from('users')
    .update({ ai_consent_at: null })
    .eq('id', user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
