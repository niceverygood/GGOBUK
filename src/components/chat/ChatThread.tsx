'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge } from '@/components/ui/primitives';

interface InitialMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PERSONA_SUBTITLE: Record<PersonaKey, string> = {
  kkobuk: '반말 친구 톤 · 빠른 답',
  dosa: '한학자 톤 · 정식 풀이',
  mudang: '직설 시크 톤 · 단도직입',
  bosal: '따뜻한 위로 톤 · 상담',
};

const SITUATION_PROMPTS = [
  {
    label: '연애중',
    prompt: '현재 연애중이야. 내 사주 기준으로 이 관계에서 조심할 점과 더 좋아지는 방법을 알려줘.',
  },
  {
    label: '취업 준비',
    prompt: '지금 취업을 준비 중이야. 내 사주에서 잘 맞는 일의 방향과 면접/준비운을 봐줘.',
  },
  {
    label: '직장 고민',
    prompt: '직장 문제로 고민 중이야. 내 사주상 일하는 방식, 갈등 포인트, 이직 타이밍을 봐줘.',
  },
  {
    label: '돈 흐름',
    prompt: '요즘 돈 흐름이 궁금해. 내 사주 기준으로 재물운, 지출 습관, 돈 모으는 방법을 알려줘.',
  },
  {
    label: '가족 관계',
    prompt: '가족 관계가 신경 쓰여. 내 사주에서 가족과의 거리감과 관계를 편하게 만드는 방법을 봐줘.',
  },
  {
    label: '오늘 컨디션',
    prompt: '오늘 내 컨디션과 감정 흐름을 사주 관점에서 짧고 현실적으로 봐줘.',
  },
];

export function ChatThread({
  sessionId,
  persona,
  initialMessages,
}: {
  sessionId: string;
  persona: PersonaKey;
  initialMessages: InitialMessage[];
}) {
  const [messages, setMessages] = useState<InitialMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const personaMeta = PERSONAS[persona];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput('');
    setRateLimited(false);
    setMessages((m) => [...m, { role: 'user', content: trimmed }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });
      if (res.status === 429) {
        setRateLimited(true);
        setMessages((m) => m.slice(0, -1));
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
          if (payload.delta) {
            setMessages((m) => {
              const cp = m.slice();
              cp[cp.length - 1] = { role: 'assistant', content: cp[cp.length - 1].content + payload.delta };
              return cp;
            });
          }
        }
      }
    } finally {
      setStreaming(false);
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
            <div className="text-base font-black text-navy">{personaMeta.displayName}</div>
            <div className="text-[11px] font-bold text-muted">{PERSONA_SUBTITLE[persona]}</div>
          </div>
        </div>
        <Link href="/persona" className="inline-flex">
          <Badge tone="mint">변신</Badge>
        </Link>
      </header>

      <div className="relative flex-1 overflow-y-auto px-4 pt-4 pb-3">
        {messages.length === 0 && (
          <div className="text-center mt-10 space-y-3">
            <div className="inline-flex">
              <KkobukAvatar variant={persona} size="lg" />
            </div>
            <p className="text-sm font-bold text-muted">{personaMeta.displayName}에게 무엇이든 물어봐</p>
            <div className="mt-5 rounded-3xl bg-white/85 border border-navy/10 p-4 text-left shadow-[0_10px_24px_rgba(44,62,80,0.06)]">
              <p className="text-sm font-black text-navy">상황을 고르면 상담이 빨라져</p>
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
            <div className="flex flex-col gap-2 mt-4 max-w-xs mx-auto">
              {personaMeta.quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-2xl bg-white py-2.5 px-4 text-sm font-bold shadow-sm border border-navy/10"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} persona={persona} />
        ))}
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
          {personaMeta.quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-navy/10 text-xs font-extrabold text-navy"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {rateLimited && (
        <div className="relative mx-4 mb-2 rounded-xl bg-gold/30 text-sm font-bold p-3 border border-gold/40">
          오늘 무료 채팅 한도(5회)에 도달했어. Pro에서는 무제한이야.
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
