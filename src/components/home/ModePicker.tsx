'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import {
  readPersonaMode,
  writePersonaMode,
} from '@/lib/utils/persona-mode';
import type { PersonaKey } from '@/lib/llm/personas';

interface ModeMeta {
  key: PersonaKey;
  name: string;
  blurb: string; // short blurb shown in compact picker
  longBlurb: string; // detailed description shown in expand state
  sample: string; // one-line sample of voice
  sprite: 'persona-kkobuk' | 'persona-dosa' | 'persona-mudang' | 'persona-bosal';
  accent: string;
}

const MODES: ModeMeta[] = [
  {
    key: 'kkobuk',
    name: '꼬북이',
    blurb: '쉽고 친근하게',
    longBlurb:
      '한자나 어려운 술어 없이 일반인이 바로 이해할 수 있게 흐르는 평문으로 풀어줘요. "너 이런 결이 있어" 식의 반말 친구 톤.',
    sample: '"너 은근 사람 잘 챙기는 타입이야. 사주에도 그게 보여."',
    sprite: 'persona-kkobuk',
    accent: 'bg-mint/20 border-mint/40 text-[#16706B]',
  },
  {
    key: 'dosa',
    name: '꼬북도사',
    blurb: '한학자 정식 풀이',
    longBlurb:
      '한자(漢字) 술어와 표·체크포인트가 포함된 정식 리포트 형식. 격국·용신·통근까지 깊이 인용. "자네" 어른 톤.',
    sample: '"자네의 정사(丁巳) 일주에 비견 3개가 겹쳐, 이는 자존감의 자리일세."',
    sprite: 'persona-dosa',
    accent: 'bg-navy/10 border-navy/30 text-navy',
  },
  {
    key: 'mudang',
    name: '꼬북무당',
    blurb: '단도직입 결단',
    longBlurb:
      '결론부터 던지고 근거는 한 줄. 짧고 강한 단락으로 "지금이야 / 미뤄 / 끊어"식 결단을 줘요. 시점·데드라인 박힌 행동 지시.',
    sample: '"이거 안 돼. 올해 관성이 흔들려. 다음 분기까지 기다려."',
    sprite: 'persona-mudang',
    accent: 'bg-red/15 border-red/30 text-red',
  },
  {
    key: 'bosal',
    name: '꼬북보살',
    blurb: '따뜻한 위로',
    longBlurb:
      '공감 먼저, 사주는 위로의 배경으로. 약점도 잠재력으로 다시 비추고 마지막에 오늘 해볼 수 있는 작은 친절 한 가지로 마무리해요.',
    sample: '"많이 무거우셨겠어요. 그 마음, 충분히 그럴 만해요."',
    sprite: 'persona-bosal',
    accent: 'bg-gold/20 border-gold/40 text-[#7C5A0E]',
  },
];

export function ModePicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<PersonaKey>('dosa');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setSelected(readPersonaMode());
  }, []);

  function pick(key: PersonaKey) {
    setSelected(key);
    writePersonaMode(key);
    setExpanded(false);
    // Trigger a server refresh so cookie-aware pages re-read the persona.
    router.refresh();
  }

  const current = MODES.find((m) => m.key === selected) ?? MODES[1];

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-xs font-extrabold text-muted">사주풀이 톤 선택</p>
          <h2 className="text-lg font-black text-navy">오늘은 어떤 꼬북이?</h2>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-black text-mint-dark"
        >
          {expanded ? '접기' : '자세히'}
        </button>
      </div>

      {/* Compact picker — 4 buttons in a row */}
      <div className="grid grid-cols-4 gap-2">
        {MODES.map((m) => {
          const isOn = m.key === selected;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => pick(m.key)}
              className={`relative rounded-2xl border p-2 transition active:scale-[0.97] ${
                isOn
                  ? `${m.accent} shadow-[0_10px_22px_rgba(44,62,80,0.1)]`
                  : 'border-navy/8 bg-white text-muted'
              }`}
            >
              {isOn && (
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-navy text-white">
                  <Check size={10} strokeWidth={3.5} />
                </span>
              )}
              <div className="flex justify-center">
                <KkobukSprite variant={m.sprite} size="sm" ariaLabel={m.name} />
              </div>
              <p className="mt-1 text-center text-[11px] font-black text-navy leading-tight">
                {m.name}
              </p>
              <p className="mt-0.5 text-center text-[9px] font-bold leading-tight text-muted">
                {m.blurb}
              </p>
            </button>
          );
        })}
      </div>

      {/* Current pick sample line — always visible */}
      <div className="mt-2 rounded-2xl bg-white/85 border border-navy/8 px-3 py-2.5">
        <p className="text-[10px] font-extrabold text-muted">
          {current.name} 톤 미리듣기
        </p>
        <p className="mt-0.5 text-xs font-bold text-navy leading-snug">
          {current.sample}
        </p>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {MODES.map((m) => {
            const isOn = m.key === selected;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => pick(m.key)}
                className={`block w-full rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                  isOn
                    ? `${m.accent} shadow-[0_8px_18px_rgba(44,62,80,0.08)]`
                    : 'border-navy/8 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <KkobukSprite variant={m.sprite} size="sm" ariaLabel={m.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-navy">{m.name}</p>
                      <span className="text-[10px] font-extrabold text-muted">
                        {m.blurb}
                      </span>
                      {isOn && (
                        <span className="ml-auto rounded-full bg-navy px-2 py-0.5 text-[9px] font-black text-white">
                          선택됨
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-bold leading-relaxed text-navy">
                      {m.longBlurb}
                    </p>
                    <p className="mt-1.5 text-[10px] font-bold leading-snug text-muted italic">
                      예: {m.sample}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
