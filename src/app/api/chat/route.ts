import { after } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { chatStream, extractCitedCards } from '@/lib/llm/chat';
import {
  loadUserMemory,
  formatUserMemory,
  updateUserMemoryFromSession,
} from '@/lib/llm/memory';
import { buildSajuResult } from '@/lib/saju';
import { CREDIT_COSTS } from '@/lib/credits';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import {
  isAiConsentRequiredError,
  requireAiConsent,
} from '@/lib/privacy/consent';
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit';
import { todayKstIso } from '@/lib/utils/date';
import type { PersonaKey } from '@/lib/llm/personas';
import type { SajuProfileRow } from '@/types/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FREE_DAILY_LIMIT = 5;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });

  try {
    await requireAiConsent(user.id);
  } catch (e) {
    if (isAiConsentRequiredError(e)) {
      return new Response('ai_consent_required', { status: 412 });
    }
    throw e;
  }

  const rl = rateLimit(rateLimitKey(user.id, 'chat'), 20, 60_000);
  if (!rl.allowed) return new Response('rate_limited', { status: 429 });

  const { sessionId, message } = (await req.json()) as {
    sessionId: string;
    message: string;
  };
  if (!sessionId || !message)
    return new Response('bad_request', { status: 400 });

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('*, saju:saju_profiles(*)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();
  if (!session) return new Response('not_found', { status: 404 });

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  const today = todayKstIso();
  const { data: usage } = await supabase
    .from('usage_logs')
    .select('chat_messages')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();
  const shouldUseCredit = (usage?.chat_messages ?? 0) >= FREE_DAILY_LIMIT;
  let spentCredit = false;
  if (shouldUseCredit) {
    try {
      await spendCredits({
        userId: user.id,
        amount: CREDIT_COSTS.chat,
        reason: '채팅 추가 질문',
        referenceId: sessionId,
      });
      spentCredit = true;
    } catch (e) {
      if (isInsufficientCreditsError(e)) {
        return new Response('insufficient_credits', { status: 402 });
      }
      throw e;
    }
  }

  // Persist user message
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: message,
  });

  // Increment usage
  await supabase.rpc('increment_chat_usage', { p_user_id: user.id });

  const sajuProfile = (session as unknown as { saju: SajuProfileRow }).saju;
  const saju = buildSajuResult({
    birthDate: sajuProfile.birth_date,
    birthTime: sajuProfile.birth_time ?? undefined,
    isLunar: sajuProfile.is_lunar,
    isLeapMonth: sajuProfile.is_leap_month,
    gender: sajuProfile.gender,
  });

  // 개인화 장기 기억 — 과거 대화를 가로질러 사용자를 기억하기 위해 시스템
  // 프롬프트에 주입한다. 기억이 없으면 빈 문자열 → chatStream 이 블록을 생략해
  // 기존 동작과 동일하게 작동한다.
  const memoryItems = await loadUserMemory(supabase, user.id);
  const memory = formatUserMemory(memoryItems);

  // 응답 후 백그라운드 기억 추출 게이팅(비용 절약): 초반 3턴은 매번, 이후 4턴마다.
  const priorUserTurns = (history ?? []).filter(
    (m) => m.role === 'user',
  ).length;
  const userTurns = priorUserTurns + 1;
  const shouldExtractMemory = userTurns <= 3 || userTurns % 4 === 0;

  const encoder = new TextEncoder();
  const admin = await createServerClient({ admin: true });

  const stream = new ReadableStream({
    async start(controller) {
      let full = '';
      try {
        for await (const chunk of chatStream({
          persona: session.persona as PersonaKey,
          saju,
          history: (history ?? []) as Array<{
            role: 'user' | 'assistant';
            content: string;
          }>,
          userMessage: message,
          name: sajuProfile.name,
          memory,
        })) {
          full += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`),
          );
        }
        const cited = extractCitedCards(full);
        await admin.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: full,
          cited_cards: cited,
        });
        await admin
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, cited })}\n\n`),
        );
      } catch (e) {
        if (spentCredit) {
          await addCredits({
            userId: user.id,
            amount: CREDIT_COSTS.chat,
            reason: '채팅 실패 환불',
            kind: 'refund',
            referenceId: sessionId,
          }).catch(() => undefined);
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: e instanceof Error ? e.message : 'error' })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  // 응답(스트리밍)이 끝난 뒤 실행 — 사용자 대기시간에 영향 없음. 게이팅된 턴에서만.
  // updateUserMemoryFromSession 은 내부에서 throw 하지 않는 best-effort.
  if (shouldExtractMemory) {
    after(() => updateUserMemoryFromSession({ userId: user.id, sessionId }));
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
