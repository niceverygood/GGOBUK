import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import { quickCompat } from '@/lib/saju/quick_compat';
import { generateCompat } from '@/lib/llm/compat';
import { addCredits } from '@/lib/credits/server';
import { INVITE_REWARD_CREDITS } from '@/lib/credits';
import { logger } from '@/lib/utils/logger';
import type { CompatibilityResult, SajuProfileRow } from '@/types/db';
import type { Palja } from '@/lib/saju/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ token: string }>;
}

// Public: fetch invite info (host name) so the page can greet the friend.
export async function GET(_req: Request, { params }: RouteContext) {
  const { token } = await params;
  const admin = await createServerClient({ admin: true });

  const { data: invite } = await admin
    .from('relation_invites')
    .select('status, expires_at, host_saju_id, guest_name')
    .eq('token', token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (new Date(invite.expires_at) < new Date())
    return NextResponse.json({ error: 'expired' }, { status: 410 });

  const { data: host } = await admin
    .from('saju_profiles')
    .select('name')
    .eq('id', invite.host_saju_id)
    .maybeSingle();

  return NextResponse.json({
    status: invite.status,
    hostName: host?.name ?? '꼬북이 친구',
    guestName: invite.guest_name ?? null,
  });
}

const Body = z.object({
  name: z.string().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isLunar: z.boolean(),
  isLeapMonth: z.boolean().optional(),
  gender: z.enum(['M', 'F']),
});

// Public: friend submits their saju → host gets a new relation + 궁합.
export async function POST(req: Request, { params }: RouteContext) {
  const { token } = await params;
  const admin = await createServerClient({ admin: true });

  const { data: invite } = await admin
    .from('relation_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (invite.status === 'completed')
    return NextResponse.json({ error: 'already_completed' }, { status: 409 });
  if (new Date(invite.expires_at) < new Date())
    return NextResponse.json({ error: 'expired' }, { status: 410 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body', detail: String(e) }, { status: 400 });
  }

  // Load host saju.
  const { data: host } = await admin
    .from('saju_profiles')
    .select('*')
    .eq('id', invite.host_saju_id)
    .maybeSingle<SajuProfileRow>();
  if (!host) return NextResponse.json({ error: 'host_missing' }, { status: 410 });

  const guestSaju = buildSajuResult({
    birthDate: body.birthDate,
    birthTime: body.birthTime,
    isLunar: body.isLunar,
    isLeapMonth: body.isLeapMonth,
    gender: body.gender,
  });

  // Insert guest as a friend profile owned by host.
  const { data: guestProfile, error: guestErr } = await admin
    .from('saju_profiles')
    .insert({
      owner_id: invite.host_user_id,
      name: body.name,
      birth_date: body.birthDate,
      birth_time: body.birthTime ?? null,
      is_lunar: body.isLunar,
      is_leap_month: body.isLeapMonth ?? false,
      gender: body.gender,
      relation_type: 'friend',
      relation_label: '초대 친구',
      palja: guestSaju.palja,
      ohaeng_count: guestSaju.ohaengCount,
      sipsung: guestSaju.sipsung,
      sinsal: guestSaju.sinsal,
      daewoon: guestSaju.daewoon,
      ilgan: guestSaju.ilgan,
    })
    .select()
    .single();
  if (guestErr) return NextResponse.json({ error: guestErr.message }, { status: 500 });

  const hostSaju = buildSajuResult({
    birthDate: host.birth_date,
    birthTime: host.birth_time ?? undefined,
    isLunar: host.is_lunar,
    isLeapMonth: host.is_leap_month,
    gender: host.gender,
  });

  // Compatibility — full LLM report when configured, else rule-based fallback.
  let compatibility: CompatibilityResult;
  try {
    compatibility = await generateCompat({
      sajuA: hostSaju,
      sajuB: guestSaju,
      nameA: host.name,
      nameB: body.name,
      relationLabel: '친구',
    });
  } catch {
    const quick = quickCompat(hostSaju.palja as Palja, guestSaju.palja as Palja);
    compatibility = {
      score: quick.score,
      hap: quick.hap,
      chung: quick.chung,
      highlights: [],
      cautions: [],
      summary: `${host.name}님과 ${body.name}님은 일주 기준으로 ${
        quick.hap.length ? '잘 맞는 합' : quick.chung.length ? '에너지를 쓰는 충' : '무난한'
      } 흐름이에요. 자세한 풀이는 꼬북점에서 확인해보세요.`,
    };
  }

  // Save the relation edge (host self ↔ guest).
  await admin
    .from('relations')
    .upsert(
      {
        user_id: invite.host_user_id,
        saju_a_id: invite.host_saju_id,
        saju_b_id: guestProfile.id,
        compatibility,
      },
      { onConflict: 'saju_a_id,saju_b_id' },
    );

  // Mark invite completed.
  await admin
    .from('relation_invites')
    .update({
      status: 'completed',
      guest_name: body.name,
      guest_saju_id: guestProfile.id,
      compatibility,
      completed_at: new Date().toISOString(),
    })
    .eq('token', token);

  // 친구 초대 보상 — host에게 +10알. invite.status가 위에서 pending→completed로
  // 바뀐 직후라 한 토큰당 1회만 지급 (이미 completed면 함수 상단에서 409 반환).
  // best-effort: 보상 실패해도 invite 완료 흐름은 그대로 진행.
  let rewardGranted = false;
  try {
    await addCredits({
      userId: invite.host_user_id,
      amount: INVITE_REWARD_CREDITS,
      reason: '친구 초대 보상',
      kind: 'bonus',
      referenceId: token,
    });
    rewardGranted = true;
  } catch (e) {
    logger.warn('relations/invite', 'invite reward grant failed', {
      hostUserId: invite.host_user_id,
      token,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // Friend sees a teaser; full report stays with host.
  return NextResponse.json({
    ok: true,
    hostName: host.name,
    guestName: body.name,
    score: compatibility.score,
    headline: compatibility.headline ?? null,
    summary: compatibility.summary,
    highlights: (compatibility.highlights ?? []).slice(0, 2),
    rewardGranted,
    rewardCredits: rewardGranted ? INVITE_REWARD_CREDITS : 0,
  });
}
