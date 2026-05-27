import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { logger } from '@/lib/utils/logger';
import type { InterpretationCategory, Persona } from '@/types/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  kind: z.enum(['interpretation', 'overview']),
  category: z.string().optional(),
  persona: z.enum(['kkobuk', 'dosa', 'mudang', 'bosal']).optional(),
});

/**
 * 토큰: url-safe, 22자. 충분히 unique + brute-force 무력화.
 * crypto.randomBytes(16) → base64url 22자.
 */
function makeToken(): string {
  return randomBytes(16)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_body', detail: e instanceof Error ? e.message : 'bad request' },
      { status: 400 },
    );
  }

  // 본인 self profile (사주풀이의 owner) 가져오기
  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('id, name, palja')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: 'no_self_profile' }, { status: 400 });
  }

  // 공유할 content snapshot 결정
  let category: InterpretationCategory | null = null;
  let persona: Persona | null = null;
  let title: string | null = null;
  let contentSnapshot = '';

  if (body.kind === 'interpretation') {
    if (!body.category) {
      return NextResponse.json({ error: 'category_required' }, { status: 400 });
    }
    const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === body.category);
    if (!cat) {
      return NextResponse.json({ error: 'unknown_category' }, { status: 400 });
    }
    category = cat.key;
    persona = (body.persona ?? 'dosa') as Persona;
    title = cat.title;

    const { data: interp } = await supabase
      .from('interpretations')
      .select('content')
      .eq('saju_id', profile.id)
      .eq('category', category)
      .eq('persona', persona)
      .maybeSingle();
    if (!interp?.content) {
      return NextResponse.json(
        { error: 'no_interpretation', detail: '먼저 풀이를 생성한 뒤 공유할 수 있어요.' },
        { status: 400 },
      );
    }
    contentSnapshot = interp.content;
  } else {
    // overview kind — palja + 간단한 한 줄. v1에선 minimal.
    title = `${profile.name ?? '익명'} 님의 사주 한눈에`;
    contentSnapshot = `## 사주 한눈에\n\n${profile.name ?? '익명'} 님의 사주를 친구가 함께 봅니다. 자세히 보려면 꼬북점에서 본인 생년월일을 입력해 보세요.`;
  }

  const token = makeToken();

  const { error: insertError } = await supabase.from('saju_shares').insert({
    token,
    owner_id: user.id,
    saju_id: profile.id,
    kind: body.kind,
    category,
    persona,
    title,
    owner_name: profile.name ?? null,
    content_snapshot: contentSnapshot,
    palja_snapshot: profile.palja ?? null,
  });

  if (insertError) {
    logger.error('share', 'failed to insert saju_share', {
      message: insertError.message,
      code: insertError.code,
    });
    return NextResponse.json(
      { error: 'insert_failed', detail: insertError.message },
      { status: 500 },
    );
  }

  // 30일 후 만료 (마이그레이션 default 따라)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  void persona; // referenced in inserts already
  void PERSONAS; // import only to keep persona key alignment readable

  return NextResponse.json({
    token,
    shareUrl: `${new URL(req.url).origin}/share/${token}`,
    expiresAt: expiresAt.toISOString(),
  });
}
