'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PERSONAS, isPersonaKey } from '@/lib/llm/personas';
import { Badge, Card, ButtonPrimary } from '@/components/ui/primitives';
import { BottomActionBar } from '@/components/nav/BottomActionBar';

export default function PersonaIntroPage() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const key = params.key;
  const [loading, setLoading] = useState(false);

  if (!isPersonaKey(key)) {
    return (
      <main className="px-5 pt-10">
        <p className="text-sm font-bold text-muted">존재하지 않는 캐릭터예요.</p>
        <Link href="/persona" className="mt-3 inline-block text-mint-dark font-extrabold text-sm">
          ← 페르소나 고르기
        </Link>
      </main>
    );
  }

  const p = PERSONAS[key];
  const cardH = 280;
  const cardW = Math.round((p.card.width / p.card.height) * cardH);

  async function startChat() {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: key }),
      });
      const d = await res.json();
      if (d.session) router.push(`/chat/${d.session.id}`);
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <main className="px-5 pt-8 pb-[15rem] relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <Link href="/persona" className="text-xs font-extrabold text-muted">
          ← 페르소나
        </Link>

        {/* Hero */}
        <div
          className="mt-4 rounded-3xl p-5 flex flex-col items-center text-center"
          style={{ background: `linear-gradient(160deg, ${p.color}22, #ffffff 70%)` }}
        >
          <Image
            src={p.card.src}
            alt={p.displayName}
            width={cardW}
            height={cardH}
            quality={95}
            priority
            className="h-[280px] w-auto rounded-2xl object-contain drop-shadow"
          />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-navy">{p.displayName}</h1>
          <p className="mt-1 text-sm font-bold" style={{ color: p.color === '#F4D03F' ? '#B8901A' : p.color }}>
            {p.tagline}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <Badge tone="mint">{p.accessoryLabel}</Badge>
            <Badge tone="navy">{p.toneLabel}</Badge>
          </div>
        </div>

        {/* Backstory */}
        <Card className="mt-5 p-5">
          <p className="text-xs font-extrabold text-muted mb-2">이야기</p>
          <p className="text-[15px] leading-relaxed font-medium text-[#3C4650]">{p.backstory}</p>
        </Card>

        {/* Personality */}
        <section className="mt-5">
          <p className="text-sm font-black text-navy mb-2">성격</p>
          <div className="flex flex-wrap gap-2">
            {p.personality.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full bg-white border border-navy/10 text-xs font-extrabold text-navy"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Best for */}
        <section className="mt-5">
          <p className="text-sm font-black text-navy mb-2">이럴 때 좋아요</p>
          <Card className="p-4">
            <ul className="space-y-2 text-sm font-bold text-[#3C4650]">
              {p.bestFor.map((b) => (
                <li key={b} className="flex gap-2">
                  <span style={{ color: p.color }}>·</span>
                  {b}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Speech samples */}
        <section className="mt-5">
          <p className="text-sm font-black text-navy mb-2">이렇게 말해요</p>
          <div className="space-y-2">
            {p.speechSamples.map((s) => (
              <div
                key={s}
                className="rounded-2xl rounded-bl-sm bg-white border border-navy/10 px-4 py-3 text-sm font-medium text-[#3C4650] shadow-[0_6px_16px_rgba(44,62,80,0.05)]"
              >
                {s}
              </div>
            ))}
          </div>
        </section>

        {/* Quick questions */}
        <section className="mt-5">
          <p className="text-sm font-black text-navy mb-2">이런 걸 물어보세요</p>
          <div className="flex flex-wrap gap-2">
            {p.quickQuestions.map((q) => (
              <span
                key={q}
                className="px-3 py-2 rounded-2xl bg-mint/10 border border-mint/30 text-xs font-bold text-navy"
              >
                {q}
              </span>
            ))}
          </div>
        </section>
      </div>

      <BottomActionBar>
        <ButtonPrimary tone="mint" onClick={startChat} disabled={loading}>
          {loading ? '대화를 여는 중...' : `${p.displayName}와 대화하기`}
        </ButtonPrimary>
      </BottomActionBar>
    </main>
  );
}
