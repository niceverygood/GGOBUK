'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';

interface InitialMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
    <div className="flex flex-col h-[calc(100dvh-72px)]">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-black/5">
        <KkobukAvatar variant={persona} size="sm" />
        <div>
          <div className="font-semibold">{personaMeta.displayName}</div>
          <div className="text-xs opacity-60">대화 중</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center mt-12 space-y-3">
            <KkobukAvatar variant={persona} size="lg" />
            <p className="text-sm opacity-70">{personaMeta.displayName}에게 무엇이든 물어봐</p>
            <div className="flex flex-col gap-2 mt-4 max-w-xs mx-auto">
              {personaMeta.quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-2xl bg-white py-2 px-4 text-sm shadow-sm"
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

      {rateLimited && (
        <div className="mx-4 mb-2 rounded-xl bg-[var(--color-gold)]/30 text-sm p-3">
          오늘 무료 채팅 한도(5회)에 도달했어. Pro에서는 무제한이야.
        </div>
      )}

      <div className="px-3 pb-3 pt-2 border-t border-black/5 bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="무엇이든 물어봐..."
            disabled={streaming}
            className="flex-1 rounded-2xl bg-[var(--color-paper)] px-4 py-3 text-sm focus:outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            className="rounded-2xl bg-[var(--color-shell-dark)] text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}
