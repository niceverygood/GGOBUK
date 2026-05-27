import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 공개 share 조회. RLS 규칙은 host(owner_id = auth.uid)만이라
 * service_role admin client로 우회해야 비로그인 친구가 볼 수 있다.
 *
 * view_count 증가시키되 만료 체크 + 최소한의 sanity check.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || typeof token !== 'string' || token.length < 10) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const admin = await createServerClient({ admin: true });

  const { data: share, error } = await admin
    .from('saju_shares')
    .select(
      'id, token, kind, category, persona, title, owner_name, content_snapshot, palja_snapshot, view_count, created_at, expires_at',
    )
    .eq('token', token)
    .maybeSingle();

  if (error) {
    logger.error('share', 'select failed', { message: error.message });
    return NextResponse.json(
      { error: 'select_failed', detail: error.message },
      { status: 500 },
    );
  }
  if (!share) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const now = Date.now();
  const expired = share.expires_at ? new Date(share.expires_at).getTime() < now : false;
  if (expired) {
    return NextResponse.json(
      {
        error: 'expired',
        expiresAt: share.expires_at,
      },
      { status: 410 }, // Gone
    );
  }

  // view_count + 1 (fire and forget)
  void admin
    .from('saju_shares')
    .update({ view_count: (share.view_count ?? 0) + 1 })
    .eq('id', share.id);

  return NextResponse.json({
    token: share.token,
    kind: share.kind,
    category: share.category,
    persona: share.persona,
    title: share.title,
    ownerName: share.owner_name,
    content: share.content_snapshot,
    palja: share.palja_snapshot,
    viewCount: (share.view_count ?? 0) + 1,
    createdAt: share.created_at,
    expiresAt: share.expires_at,
  });
}
