'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
// ⚠️ lib/llm/personas 를 import 하면 systemPrompt 전문(안전가드 포함)이 클라이언트 번들에 실린다.
// 표시용 이름만 필요하므로 순수 모듈을 쓴다.
import { personaDisplay } from '@/domain/persona/display';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { CREDIT_COSTS } from '@/lib/credits';
import { isNativeApp } from '@/lib/utils/platform';
import { track } from '@/lib/analytics/track';

interface InitialMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SITUATION_PROMPTS = [
  {
    label: '연애중',
    prompt:
      '현재 연애중이야. 내 사주 기준으로 이 관계에서 조심할 점과 더 좋아지는 방법을 알려줘.',
  },
  {
    label: '취업 준비',
    prompt:
      '지금 취업을 준비 중이야. 내 사주에서 잘 맞는 일의 방향과 면접/준비운을 봐줘.',
  },
  {
    label: '직장 고민',
    prompt:
      '직장 문제로 고민 중이야. 내 사주상 일하는 방식, 갈등 포인트, 이직 타이밍을 봐줘.',
  },
  {
    label: '돈 흐름',
    prompt:
      '요즘 돈 흐름이 궁금해. 내 사주 기준으로 재물운, 지출 습관, 돈 모으는 방법을 알려줘.',
  },
  {
    label: '가족 관계',
    prompt:
      '가족 관계가 신경 쓰여. 내 사주에서 가족과의 거리감과 관계를 편하게 만드는 방법을 봐줘.',
  },
  {
    label: '오늘 컨디션',
    prompt: '오늘 내 컨디션과 감정 흐름을 사주 관점에서 짧고 현실적으로 봐줘.',
  },
];

export function ChatThread({
  sessionId,
  initialMessages,
}: {
  sessionId: string;
  initialMessages: InitialMessage[];
}) {
  // v2 단순화: 페르소나는 꼬북이 하나로 고정.
  const persona = 'kkobuk' as const;
  const [messages, setMessages] = useState<InitialMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [needsCredit, setNeedsCredit] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 사용자가 타이핑 중간에 탭하면 true가 되어, 이후로는 받는 텍스트 전부를
  // 즉시 노출한다 (스트림은 그대로 계속 받음).
  const skipRef = useRef(false);
  const personaMeta = personaDisplay(persona);

  function skipTyping() {
    if (streaming) skipRef.current = true;
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear any running typing interval on unmount.
  useEffect(() => {
    return () => {
      if (typerRef.current) clearInterval(typerRef.current);
    };
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput('');
    setRateLimited(false);
    setNeedsCredit(false);
    skipRef.current = false;
    setMessages((m) => [
      ...m,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '' },
    ]);
    setStreaming(true);

    // Typing queue: the network fills `target`, while a steady interval reveals
    // it a few chars at a time so big SSE chunks don't pop in all at once.
    // If user taps mid-typing (skipRef=true), the queue drains instantly each tick.
    const target = { text: '' };
    let shown = 0;
    let streamDone = false;

    const stopTyper = () => {
      if (typerRef.current) {
        clearInterval(typerRef.current);
        typerRef.current = null;
      }
    };

    typerRef.current = setInterval(() => {
      if (shown < target.text.length) {
        const backlog = target.text.length - shown;
        let step: number;
        if (skipRef.current) {
          // 사용자가 화면 탭 → 받은 텍스트 즉시 전체 노출, 이후 들어오는
          // 청크도 매 tick마다 backlog 전부 흘려보냄.
          step = backlog;
        } else {
          // Comfortable reading speed: ~38자/초 평소, backlog 많아도 부드럽게.
          step = backlog > 400 ? 3 : backlog > 200 ? 2 : 1;
        }
        shown = Math.min(target.text.length, shown + step);
        const slice = target.text.slice(0, shown);
        setMessages((m) => {
          const cp = m.slice();
          cp[cp.length - 1] = { role: 'assistant', content: slice };
          return cp;
        });
      } else if (streamDone) {
        stopTyper();
        setStreaming(false);
      }
    }, 26);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });
      if (res.status === 429) {
        stopTyper();
        setStreaming(false);
        setRateLimited(true);
        setMessages((m) => m.slice(0, -1));
        // 결제 의도 peak — 무료 채팅 한도 도달(더 대화하려면 결제했을 순간).
        track('paywall_view', { peak: 'chat_limit', reason: 'rate_limited' });
        return;
      }
      if (res.status === 402) {
        stopTyper();
        setStreaming(false);
        setNeedsCredit(true);
        setMessages((m) => m.slice(0, -1));
        track('paywall_view', { peak: 'chat_limit', reason: 'needs_credit' });
        return;
      }
      if (!res.ok || !res.body) throw new Error('chat failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.error) throw new Error(payload.error);
          // Feed the buffer; the typer reveals it smoothly.
          if (payload.delta) target.text += payload.delta;
        }
      }
      streamDone = true;
      // Let the typer drain the remaining buffer, then it stops itself.
      // Safety net in case the interval was already cleared.
      if (!typerRef.current) setStreaming(false);
    } catch {
      streamDone = true;
      // 아무것도 못 받았으면 빈 말풍선 대신 에러 메시지를 보여준다(무표시 방지).
      if (target.text.length === 0) {
        stopTyper();
        setStreaming(false);
        setMessages((m) => {
          const cp = m.slice();
          cp[cp.length - 1] = {
            role: 'assistant',
            content: '⚠️ 답변을 받지 못했어요. 잠깐 후 다시 시도해 주세요.',
          };
          return cp;
        });
      }
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-72px)] relative">
      <div className="hanji-overlay" />
      <header className="relative flex items-center justify-between px-5 py-3 border-b border-navy/5 bg-soft/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-mint/30 border border-navy/10 flex items-center justify-center overflow-hidden">
            <KkobukAvatar variant={persona} size="sm" />
          </div>
          <div>
            <div className="text-base font-black text-navy">
              {personaMeta.displayName}
            </div>
            <div className="text-[11px] font-bold text-muted">
              내 사주를 아는 친구 · 무엇이든 물어봐
            </div>
          </div>
        </div>
      </header>

      <div
        className="relative flex-1 overflow-y-auto px-4 pt-4 pb-3"
        onClick={skipTyping}
      >
        {messages.length === 0 && (
          <div className="text-center mt-10 space-y-3">
            <div className="inline-flex">
              <KkobukAvatar variant={persona} size="lg" />
            </div>
            <p className="text-sm font-bold text-muted">
              {personaMeta.displayName}에게 무엇이든 물어봐
            </p>
            <div className="mt-5 rounded-3xl bg-white/85 border border-navy/10 p-4 text-left shadow-[0_10px_24px_rgba(44,62,80,0.06)]">
              <p className="text-sm font-black text-navy">
                상황을 고르면 상담이 빨라져
              </p>
              <p className="mt-1 text-xs font-bold text-muted">
                지금 상태를 하나만 골라도 사주 풀이가 훨씬 구체적으로 시작돼.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SITUATION_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => send(item.prompt)}
                    className="rounded-full border border-navy/10 bg-ivory px-3 py-2 text-xs font-extrabold text-navy transition active:scale-[0.98]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <ChatMessage
            key={i}
            role={m.role}
            content={m.content}
            persona={persona}
          />
        ))}
        {/* eslint-disable-next-line react-hooks/refs -- 스트리밍 진행 힌트: streaming state 변화로 재렌더되어 ref 읽기가 안전 */}
        {streaming && !skipRef.current && (
          <p className="text-center text-[10px] font-bold text-muted/70 mb-2 select-none">
            화면을 한 번 탭하면 답변 전체가 즉시 표시돼요
          </p>
        )}
        <div ref={endRef} />
      </div>

      {messages.length > 0 && (
        <div className="relative px-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
          {SITUATION_PROMPTS.slice(0, 4).map((item) => (
            <button
              key={item.label}
              onClick={() => send(item.prompt)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-mint/15 border border-mint/30 text-xs font-extrabold text-navy"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {rateLimited && (
        <div className="relative mx-4 mb-2 rounded-xl bg-gold/30 text-sm font-bold p-3 border border-gold/40">
          오늘 무료 채팅 한도(5회)에 도달했어. 꼬북알이 있으면 계속 질문할 수
          있어.
        </div>
      )}

      {needsCredit && (
        <div className="relative mx-4 mb-2 rounded-xl bg-gold/30 text-sm font-bold p-3 border border-gold/40">
          꼬북알이 부족해. 추가 질문은 {CREDIT_COSTS.chat}꼬북알을 사용해.
          {!isNativeApp() && (
            <Link href="/store" className="ml-2 underline underline-offset-4">
              충전하기
            </Link>
          )}
        </div>
      )}

      <div className="relative px-3 pb-3 pt-2 border-t border-navy/5 bg-white">
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="궁금한 걸 물어보세요"
            disabled={streaming}
            className="flex-1 h-12 rounded-2xl bg-ivory px-4 text-sm font-bold focus:outline-none border border-navy/10"
          />
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            aria-label="보내기"
            className="h-12 w-12 rounded-2xl bg-navy text-white disabled:opacity-50 text-lg flex items-center justify-center"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
