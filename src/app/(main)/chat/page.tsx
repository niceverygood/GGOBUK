'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PersonaSwitcher } from '@/components/kkobuk/PersonaSwitcher';
import type { PersonaKey } from '@/lib/llm/personas';
import { PERSONAS } from '@/lib/llm/personas';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';

interface SessionRow {
  id: string;
  persona: PersonaKey;
  title: string | null;
  updated_at: string;
}

export default function ChatListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<PersonaKey>('kkobuk');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch('/api/chat/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, []);

  async function startNew() {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: selected }),
      });
      const d = await res.json();
      if (d.session) router.push(`/chat/${d.session.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-5 pt-8 pb-12">
      <h1 className="text-2xl font-bold">꼬북이와 대화</h1>
      <p className="mt-1 text-xs opacity-60">페르소나를 골라 새 대화를 시작해</p>

      <div className="mt-5">
        <PersonaSwitcher selected={selected} onSelect={setSelected} />
      </div>

      <button
        onClick={startNew}
        disabled={loading}
        className="mt-5 w-full rounded-2xl bg-[var(--color-shell-dark)] text-white py-3 font-semibold disabled:opacity-60"
      >
        {PERSONAS[selected].displayName}와 새 대화
      </button>

      <section className="mt-10">
        <div className="text-sm font-semibold mb-3">최근 대화</div>
        {sessions.length === 0 && <p className="text-xs opacity-60">아직 대화가 없어. 위에서 시작해봐.</p>}
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/chat/${s.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <KkobukAvatar variant={s.persona} size="sm" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {PERSONAS[s.persona].displayName}
                  </div>
                  <div className="text-xs opacity-60">{new Date(s.updated_at).toLocaleString('ko-KR')}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
