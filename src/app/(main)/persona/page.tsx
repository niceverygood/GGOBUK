'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { KkobukSprite, type SpriteKey } from '@/components/kkobuk/KkobukSprite';
import { Badge, Card, ButtonPrimary } from '@/components/ui/primitives';
import { BottomActionBar } from '@/components/nav/BottomActionBar';
import {
  readPersonaMode,
  writePersonaMode,
} from '@/lib/utils/persona-mode';

const PERSONA_SPRITE: Record<PersonaKey, SpriteKey> = {
  kkobuk: 'persona-kkobuk',
  dosa: 'persona-dosa',
  mudang: 'persona-mudang',
  bosal: 'persona-bosal',
};

const PERSONA_CARD: Record<PersonaKey, { src: string; width: number; height: number }> = {
  kkobuk: { src: '/characters/ggobuk/cards/hires/card_basic_friend@2x.png', width: 1848, height: 2776 },
  dosa: { src: '/characters/ggobuk/cards/hires/card_saju_master@2x.png', width: 2080, height: 2776 },
  mudang: { src: '/characters/ggobuk/cards/hires/card_direct_shaman@2x.png', width: 2208, height: 2776 },
  bosal: { src: '/characters/ggobuk/cards/hires/card_comfort_bodhisattva@2x.png', width: 2320, height: 2776 },
};
import { cn } from '@/lib/utils/cn';

const SUBTITLES: Record<PersonaKey, string> = {
  kkobuk: '동글동글 반말 친구 톤 · 매일 운세와 푸시',
  dosa: '흰 수염 한학자 톤 · 정식 사주 풀이',
  mudang: '방울 들고 직설 시크 MZ 톤 · 단도직입 답변',
  bosal: '염주 두른 따뜻한 위로 톤 · 인간관계 상담',
};

export default function PersonaSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PersonaKey>('dosa');
  const [loading, setLoading] = useState(false);

  // 페이지 진입 시 cookie/localStorage에 저장된 mode를 가져와 초기 선택.
  // 사용자가 '꼬북무당' 선택하고 채팅 가는 동안 cookie도 함께 갱신해
  // 다음에 사주풀이 들어가면 같은 페르소나로 자동 적용된다 (혼동 제거).
  useEffect(() => {
    setSelected(readPersonaMode());
  }, []);

  function pickPersona(key: PersonaKey) {
    setSelected(key);
    // 채팅 페르소나 선택은 사주풀이 모드와 동기화 (단일 페르소나 컨셉).
    writePersonaMode(key);
  }
  const selectedCard = PERSONA_CARD[selected];
  const selectedCardHeight = 384;
  const selectedCardWidth = Math.round(
    (selectedCard.width / selectedCard.height) * selectedCardHeight,
  );

  async function start() {
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
    <main className="px-5 pt-8 pb-[15rem] relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <Badge>페르소나 전환</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-navy leading-snug">
          오늘은 어떤 꼬북이에게<br />물어볼까요?
        </h1>
        <p className="mt-2 text-sm font-semibold text-[#82786D]">
          본체는 같은 꼬북이지만, 액세서리에 따라 말투와 해석 방식이 달라져요.
        </p>

        <div className="mt-6 space-y-3">
          {(Object.keys(PERSONAS) as PersonaKey[]).map((k) => {
            const p = PERSONAS[k];
            const active = selected === k;
            return (
              <div
                key={k}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-3xl bg-white border shadow-[0_10px_24px_rgba(44,62,80,0.06)] transition',
                  active ? 'border-2 border-mint bg-gradient-to-r from-mint/15 to-white' : 'border border-navy/10',
                )}
              >
                <button
                  onClick={() => pickPersona(k)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                >
                  <div className="w-16 h-16 rounded-2xl bg-mint/20 flex items-center justify-center overflow-hidden shrink-0">
                    <KkobukSprite variant={PERSONA_SPRITE[k]} size="md" ariaLabel={p.displayName} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-navy">{p.displayName}</h3>
                    <p className="text-xs font-semibold text-[#82786D] mt-0.5">{SUBTITLES[k]}</p>
                  </div>
                </button>
                <Link
                  href={`/persona/${k}`}
                  className="shrink-0 px-3 py-2 rounded-full bg-navy/5 text-[11px] font-extrabold text-navy"
                >
                  소개
                </Link>
              </div>
            );
          })}
        </div>

        <Card className="mt-5 p-4">
          <div className="flex items-center gap-4">
            <Image
              src={selectedCard.src}
              alt={PERSONAS[selected].displayName}
              width={selectedCardWidth}
              height={selectedCardHeight}
              sizes={`${Math.round((selectedCardWidth / selectedCardHeight) * 128)}px`}
              unoptimized
              className="h-32 w-auto shrink-0 rounded-xl object-contain"
            />
            <div>
              <p className="text-sm font-black text-navy">현재 선택: {PERSONAS[selected].displayName}</p>
              <p className="mt-1 text-sm font-semibold text-[#82786D]">{SUBTITLES[selected]}</p>
            </div>
          </div>
        </Card>
      </div>

      <BottomActionBar>
        <ButtonPrimary tone="mint" onClick={start} disabled={loading}>
          {loading ? '대화를 여는 중...' : '이 모드로 대화하기'}
        </ButtonPrimary>
      </BottomActionBar>
    </main>
  );
}
