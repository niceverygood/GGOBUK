import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveRepresentativeProfile } from '@/lib/profiles/resolve';
import { hasAiConsent } from '@/lib/privacy/consent';
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit';
import { ensureDailyFortune } from '@/lib/daily/ensure';
import { todayKstIso } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import type { SajuProfileRow } from '@/types/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

export interface BreadOpenState {
  alreadyOpened: boolean;
  isGolden: boolean;
  /** 이번 오픈으로 찍힌 도장 번호 (1..7) */
  stampNo: number;
  /** 오픈 후 현재 사이클 도장 수 (0..6) */
  stamps: number;
  rewardCredits: number;
  balance: number;
  monthlyRewardCount: number;
}

/**
 * 행운의 거북빵 열기 — 하루 1회 무료.
 *
 * 거북빵은 별도 콘텐츠가 아니라 그날의 `daily_fortunes` 를 여는 의식이다.
 * 이 라우트가 (1) 출석 도장·보상을 원자적으로 처리하고 (2) 그날 운세를 보장한 뒤
 * 둘을 함께 돌려준다. 굽는 애니메이션이 LLM 생성 대기시간을 덮는다.
 */
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = rateLimit(rateLimitKey(user.id, 'bread-open'), 10, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const resolved = await resolveRepresentativeProfile(supabase, user.id);
  if (!resolved.ok)
    return NextResponse.json({ error: 'no_profile' }, { status: 404 });
  const profile = resolved.profile;

  // 운세 본문 생성에는 AI 동의가 필요하다. 미동의면 도장도 찍지 않고 돌려보낸다
  // (도장만 찍히고 내용은 못 보는 상태를 만들지 않기 위해).
  if (!(await hasAiConsent(user.id))) {
    return NextResponse.json(
      { error: 'ai_consent_required' },
      { status: 412 },
    );
  }

  // 1) 출석 도장 + 보상 (원자적, 하루 1회 멱등)
  //    ⚠️ 경제 파라미터(도장수·보상량·월상한·확률)는 넘기지 않는다 — DB 함수 내부 상수다.
  //    호출 인자로 받으면 임의 재화 발행이 가능해진다. `src/lib/credits.ts` 의 BREAD 는
  //    UI 표시 전용이며 DB 상수와 값이 같아야 한다(migration 18 참조).
  const { data: rpcData, error: rpcError } = await supabase.rpc('open_bread', {
    p_user_id: user.id,
  });

  if (rpcError) {
    logger.error('bread/open', 'open_bread rpc failed', {
      userId: user.id,
      message: rpcError.message,
    });
    return NextResponse.json({ error: 'bread_failed' }, { status: 500 });
  }

  const raw = (rpcData ?? {}) as Record<string, unknown>;
  const bread: BreadOpenState = {
    alreadyOpened: Boolean(raw.already_opened),
    isGolden: Boolean(raw.is_golden),
    stampNo: Number(raw.stamp_no ?? 0),
    stamps: Number(raw.stamps ?? 0),
    rewardCredits: Number(raw.reward_credits ?? 0),
    balance: Number(raw.balance ?? 0),
    monthlyRewardCount: Number(raw.monthly_reward_count ?? 0),
  };

  // 2) 그날 운세 보장 (있으면 재사용, 없으면 생성)
  const result = await ensureDailyFortune({
    profile,
    date: todayKstIso(),
  });

  if (!result.ok) {
    logger.error('bread/open', 'daily fortune failed', {
      userId: user.id,
      reason: result.reason,
      message: result.message,
    });
    // 도장은 이미 찍혔다. 내용만 비워 돌려주고 클라이언트가 재시도하게 한다.
    return NextResponse.json(
      {
        bread,
        daily: null,
        error:
          result.reason === 'llm_not_configured'
            ? 'llm_not_configured'
            : 'daily_failed',
      },
      { status: result.reason === 'llm_not_configured' ? 503 : 500 },
    );
  }

  return NextResponse.json({ bread, daily: result.daily });
}
