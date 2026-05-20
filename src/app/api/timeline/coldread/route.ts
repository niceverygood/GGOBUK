import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { buildSajuResult } from "@/lib/saju";
import { generateColdRead, generateFallbackColdRead } from "@/lib/llm/coldread";
import { CREDIT_COSTS } from "@/lib/credits";
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from "@/lib/credits/server";
import { rateLimit, rateLimitKey } from "@/lib/utils/rate-limit";
import { logger } from "@/lib/utils/logger";

const Body = z.object({
  daewoonStartYear: z.number().int(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(rateLimitKey(user.id, "coldread"), 10, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = Body.parse(await req.json());

  const { data: profile } = await supabase
    .from("saju_profiles")
    .select("*")
    .eq("owner_id", user.id)
    .eq("relation_type", "self")
    .maybeSingle();
  if (!profile)
    return NextResponse.json({ error: "no profile" }, { status: 404 });

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  const period = saju.daewoon.find(
    (d) => d.startYear === body.daewoonStartYear,
  );
  if (!period)
    return NextResponse.json({ error: "period not found" }, { status: 404 });

  let creditsSpent = false;
  try {
    await spendCredits({
      userId: user.id,
      amount: CREDIT_COSTS.daewoon,
      reason: "대운 AI 해설",
      referenceId: String(period.startYear),
    });
    creditsSpent = true;
  } catch (e) {
    if (isInsufficientCreditsError(e)) {
      return NextResponse.json(
        { error: "insufficient_credits" },
        { status: 402 },
      );
    }
    logger.warn("timeline/coldread", "credit spend skipped", {
      userId: user.id,
      startYear: period.startYear,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  try {
    const text = await generateColdRead({
      saju,
      daewoon: period,
      name: profile.name,
    });

    return NextResponse.json({ text });
  } catch (e) {
    if (creditsSpent) {
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.daewoon,
        reason: "대운 AI 해설 실패 환불",
        kind: "refund",
        referenceId: String(period.startYear),
      }).catch(() => undefined);
    }

    logger.error("timeline/coldread", "failed; using fallback", {
      userId: user.id,
      startYear: period.startYear,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({
      text: generateFallbackColdRead({
        saju,
        daewoon: period,
        name: profile.name,
      }),
    });
  }
}
