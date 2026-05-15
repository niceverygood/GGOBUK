'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, ButtonPrimary } from '@/components/ui/primitives';

interface SessionRow {
  id: string;
  persona: PersonaKey;
  title: string | null;
  updated_at: string;
}

export default function ChatListPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    void fetch('/api/chat/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, []);

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <Badge>대화</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-navy">꼬북이와 대화</h1>
        <p className="mt-1 text-sm font-semibold text-[#82786D]">페르소나를 골라 새 대화를 시작해</p>

        <Link href="/persona" className="block mt-6">
          <ButtonPrimary tone="mint">＋ 새 대화 시작하기</ButtonPrimary>
        </Link>

        <section className="mt-8">
          <p className="text-sm font-black text-navy mb-3">최근 대화</p>
          {sessions.length === 0 ? (
            <p className="text-xs font-bold text-muted">아직 대화가 없어. 위에서 시작해봐.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/chat/${s.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-white border border-navy/10 p-3 shadow-[0_9px_22px_rgba(44,62,80,0.06)]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-mint/30 border border-navy/10 flex items-center justify-center overflow-hidden">
                      <KkobukAvatar variant={s.persona} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-navy">
                        {PERSONAS[s.persona].displayName}
                      </div>
                      <div className="text-xs font-bold text-muted truncate">
                        {new Date(s.updated_at).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
