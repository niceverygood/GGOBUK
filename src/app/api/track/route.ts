// 익명 포함 이벤트 수집 엔드포인트.
//
// 로그인 전 방문자(page_view 등)도 기록해야 하므로 인증을 요구하지 않는다.
// anon_id(쿠키)·IP 기준으로 rate-limit 하고, 화이트리스트 이벤트만 기록한다.
// 항상 204 로 fire-and-forget 응답한다(클라이언트는 결과를 신경쓰지 않음).

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { recordEvent, isTrackableEvent } from '@/lib/analytics/events';
import { rateLimit } from '@/lib/utils/rate-limit';

export const runtime = 'nodejs';

const NO_CONTENT = new NextResponse(null, { status: 204 });

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** props 를 작은 평면 객체로 정제(중첩/거대 페이로드 차단). */
function sanitizeProps(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, unknown> = {};
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= 12) break;
    if (typeof k !== 'string' || k.length > 40) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 200);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else continue;
    n++;
  }
  return out;
}

export async function POST(req: Request) {
  let payload: { event?: unknown; path?: unknown; props?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NO_CONTENT;
  }

  const event = typeof payload.event === 'string' ? payload.event : '';
  if (!isTrackableEvent(event)) return NO_CONTENT;

  // rate-limit: anon_id 쿠키 우선, 없으면 IP. 분당 60건.
  const store = req.headers.get('cookie') ?? '';
  const anonMatch = /(?:^|;\s*)kj_anon=([^;]+)/.exec(store);
  const rlKey = `track:${anonMatch?.[1] ?? clientIp(req)}`;
  if (!rateLimit(rlKey, 60, 60_000).allowed) return NO_CONTENT;

  // 로그인 사용자면 user_id 를 붙인다(익명이면 null).
  let userId: string | null = null;
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const path = typeof payload.path === 'string' ? payload.path.slice(0, 300) : null;

  // recordEvent 가 쿠키에서 anon_id·attribution 을 자동으로 채운다.
  await recordEvent({
    event,
    userId,
    path,
    props: sanitizeProps(payload.props),
  });

  return NO_CONTENT;
}
