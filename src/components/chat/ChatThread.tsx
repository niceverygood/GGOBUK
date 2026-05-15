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
