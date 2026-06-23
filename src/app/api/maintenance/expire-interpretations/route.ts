import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 사주 풀이 3일 보관 정책 — generated_at + 3일 이전 row 자동 삭제.
 *
 * 이유:
 * - 모드 변경 시 다이얼로그가 "보관함에 3일 동안 보관" 약속
 * - 활성 모드 외 풀이는 시간 지나면 다시 받게(=재결제 유도) + DB 용량 절약
 * - 사용자는 보관함에서 만료 임박 풀이 확인 가능
 *
 * 호출:
 *  - Vercel Cron (vercel.json) 매일 KST 06:30 (UTC 21:30, daily 운세 발송 30분 전)
 *    Vercel cron은 GET 으로 보냄 → GET / POST 둘 다 지원.
 *  - 수동: curl -H "Authorization: Bearer <CRON_SECRET>" .../api/maintenance/expire-interpretations
 *
 * 안전장치:
 *  - CRON_SECRET 검증 (없으면 401)
 *  - service_role admin client (RLS 우회)
 *  - 일괄 삭제 결과 카운트 반환
 */
async function handle(req: Request) {
  // Cron 인증
  // fail-closed: CRON_SECRET 미설정이면 인증 불가 → 거부(누구나 전체 풀이 삭제 못 하게).
  const secret = process.env.CRON_SECRET;
  const vercelCronAuth =
    !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
  const legacyCronAuth = !!secret && req.headers.get('x-cron-secret') === secret;
  if (!vercelCronAuth && !legacyCronAuth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = await createServerClient({ admin: true });

  // 3일 이전(만료) row 삭제
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await admin
    .from('interpretations')
    .delete({ count: 'exact' })
    .lt('generated_at', cutoff);

  if (error) {
    logger.error('maintenance', 'expire-interpretations failed', {
      message: error.message,
    });
    return NextResponse.json(
      { error: 'delete_failed', detail: error.message },
      { status: 500 },
    );
  }

  logger.warn('maintenance', 'expired interpretations swept', {
    deleted: count ?? 0,
    cutoff,
  });
  return NextResponse.json({ deleted: count ?? 0, cutoff });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
