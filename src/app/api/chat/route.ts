import { createServerClient } from '@/lib/supabase/server';
import { chatStream, extractCitedCards } from '@/lib/llm/chat';
import { buildSajuResult } from '@/lib/saju';
import { CREDIT_COSTS } from '@/lib/credits';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
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

  const today = new Date().toISOString().slice(0, 10);
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

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
