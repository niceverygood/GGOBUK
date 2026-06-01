import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { loadUserMemory } from '@/lib/llm/memory';

export const runtime = 'nodejs';

// 꼬북이가 나에 대해 기억하는 것 — 본인만 조회/삭제(투명성·삭제권).
export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const items = await loadUserMemory(supabase, user.id);
  // 살리언스·최근순 정렬해서 노출.
  const sorted = [...items].sort(
    (a, b) => b.salience - a.salience || b.lastSeenAt.localeCompare(a.lastSeenAt),
  );
  return NextResponse.json({ items: sorted });
}

// DELETE ?id=<itemId> → 해당 항목만 삭제. id 없으면 전체 삭제.
// RLS owner 정책으로 본인 행만 갱신 가능(서버 service_role 불필요).
export async function DELETE(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');

  if (!id) {
    // 전체 삭제 — 행을 비운다.
    const { error } = await supabase
      .from('user_memory')
      .update({ items: [], updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, items: [] });
  }

  const items = await loadUserMemory(supabase, user.id);
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) {
    // 이미 없음 — 멱등 성공.
    return NextResponse.json({ ok: true, items: next });
  }

  const { error } = await supabase
    .from('user_memory')
    .update({ items: next, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: next });
}
