'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Badge, Card } from '@/components/ui/primitives';
import { PERSONAS, PERSONA_ORDER, type PersonaKey } from '@/lib/llm/personas';
import { readPersonaMode, writePersonaMode } from '@/lib/utils/persona-mode';

interface InterpStyle {
  hanja: string;
  structure: string;
  length: string;
  endsWith: string;
}

const INTERP_STYLE: Record<PersonaKey, InterpStyle> = {
  kkobuk: {
    hanja: '한자 거의 없음',
    structure: '흐르는 평문 (표·헤딩 ❌)',
    length: '800–1,200자',
    endsWith: '오늘 해볼 수 있는 작은 행동 한 가지',
  },
  dosa: {
    hanja: '한자(漢字) 정확 병기',
    structure: '판독 근거 표 + 체크포인트 + 깊은 풀이 + 활용 처방',
    length: '2,200–3,200자',
    endsWith: '4-섹션 정식 리포트',
  },
  mudang: {
    hanja: '핵심 한 줄 인용만',
    structure: '짧은 평문 4–5단락',
    length: '600–1,000자',
    endsWith: '시점·데드라인 박힌 행동 지시',
  },
  bosal: {
    hanja: '위로의 배경으로만',
    structure: '평문 4–5단락 (공감 우선)',
    length: '1,000–1,500자',
    endsWith: '오늘 해볼 작은 친절 한 가지',
  },
};

const ACCENT: Record<
  PersonaKey,
  {
    bg: string;
    border: string;
    text: string;
    button: string;
    softBg: string;
  }
> = {
  kkobuk: {
    bg: 'bg-gradient-to-br from-mint/22 via-white to-gold/10',
    border: 'border-mint/45',
    text: 'text-[#16706B]',
    button: 'bg-mint text-[#163438]',
    softBg: 'bg-mint/12',
  },
  dosa: {
    bg: 'bg-gradient-to-br from-navy/8 via-white to-mint/10',
    border: 'border-navy/30',
    text: 'text-navy',
    button: 'bg-navy text-white',
    softBg: 'bg-navy/8',
  },
  mudang: {
    bg: 'bg-gradient-to-br from-red/10 via-white to-gold/12',
    border: 'border-red/35',
    text: 'text-red',
    button: 'bg-red text-white',
    softBg: 'bg-red/10',
  },
  bosal: {
    bg: 'bg-gradient-to-br from-gold/18 via-white to-mint/12',
    border: 'border-gold/45',
    text: 'text-[#7C5A0E]',
    button: 'bg-gold text-[#3A2E0C]',
    softBg: 'bg-gold/15',
  },
};

const PERSONA_SPRITE: Record<PersonaKey, 'persona-kkobuk' | 'persona-dosa' | 'persona-mudang' | 'persona-bosal'> = {
  kkobuk: 'persona-kkobuk',
  dosa: 'persona-dosa',
  mudang: 'persona-mudang',
  bosal: 'persona-bosal',
};

export function ModeSelectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [current, setCurrent] = useState<PersonaKey>('dosa');

  useEffect(() => {
    setCurrent(readPersonaMode());
  }, []);

  function pick(key: PersonaKey) {
    setCurrent(key);
    writePersonaMode(key);
    // 어디서 왔는지 명시적 from 파라미터가 있으면 그 곳으로, 아니면 뒤로.
    const from = searchParams.get('from');
    if (from && from.startsWith('/')) {
      router.replace(from);
    } else {
      router.back();
    }
  }

  return (
    <main className="px-5 pt-7 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs font-black text-muted"
        >
          <ArrowLeft size={14} strokeWidth={3} />
          뒤로
        </button>

        <div className="mt-3 pr-12">
          <p className="text-xs font-extrabold text-muted">사주풀이 톤 선택</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-navy">
            어떤 꼬북이로 풀이받을까?
          </h1>
          <p className="mt-2 text-xs font-bold leading-relaxed text-muted">
            본체는 같은 거북이지만, 액세서리에 따라 말투와 해석 깊이가 완전히
            달라져요. 같은 사주도 4가지 다른 풀이로 받아볼 수 있습니다.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {PERSONA_ORDER.map((key) => {
            const p = PERSONAS[key];
            const style = INTERP_STYLE[key];
            const tone = ACCENT[key];
            const isOn = key === current;
            return (
              <Card
                key={key}
                className={`overflow-hidden p-0 border ${isOn ? tone.border : 'border-navy/8'}`}
              >
                <div className={`${tone.bg} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <KkobukSprite
                        variant={PERSONA_SPRITE[key]}
                        size="lg"
                        ariaLabel={p.displayName}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black text-navy">
                            {p.displayName}
                          </h2>
                          {isOn && (
                            <Badge tone="mint" className="px-2 py-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px]">
                                <Check size={10} strokeWidth={3.5} />
                                선택됨
                              </span>
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs font-bold text-muted">
                          {p.tagline}
                        </p>
                        <p className="mt-1 text-[11px] font-extrabold text-mint-dark">
                          {p.toneLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[12px] font-bold leading-relaxed text-navy">
                    {p.backstory}
                  </p>

                  {/* 풀이 스타일 4-속성 */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className={`rounded-2xl ${tone.softBg} p-2.5`}>
                      <p className={`text-[10px] font-extrabold ${tone.text}`}>
                        한자 사용
                      </p>
                      <p className="mt-0.5 text-[11px] font-black text-navy leading-tight">
                        {style.hanja}
                      </p>
                    </div>
                    <div className={`rounded-2xl ${tone.softBg} p-2.5`}>
                      <p className={`text-[10px] font-extrabold ${tone.text}`}>
                        구조
                      </p>
                      <p className="mt-0.5 text-[11px] font-black text-navy leading-tight">
                        {style.structure}
                      </p>
                    </div>
                    <div className={`rounded-2xl ${tone.softBg} p-2.5`}>
                      <p className={`text-[10px] font-extrabold ${tone.text}`}>
                        분량
                      </p>
                      <p className="mt-0.5 text-[11px] font-black text-navy leading-tight">
                        {style.length}
                      </p>
                    </div>
                    <div className={`rounded-2xl ${tone.softBg} p-2.5`}>
                      <p className={`text-[10px] font-extrabold ${tone.text}`}>
                        마무리
                      </p>
                      <p className="mt-0.5 text-[11px] font-black text-navy leading-tight">
                        {style.endsWith}
                      </p>
                    </div>
                  </div>

                  {/* 잘 맞는 상황 */}
                  <div className="mt-4">
                    <p className="text-[10px] font-extrabold text-muted">
                      이럴 때 좋아요
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.bestFor.map((b) => (
                        <span
                          key={b}
                          className="rounded-full bg-white/85 border border-navy/8 px-2 py-1 text-[10px] font-black text-navy"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 말투 샘플 */}
                  <div className="mt-4 rounded-2xl bg-white/85 border border-navy/10 p-3">
                    <p className="text-[10px] font-extrabold text-muted">
                      말투 미리듣기
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {p.speechSamples.slice(0, 2).map((sample) => (
                        <li
                          key={sample}
                          className="text-[12px] font-bold leading-snug text-navy"
                        >
                          “{sample}”
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 성격 키워드 */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.personality.map((trait) => (
                      <span
                        key={trait}
                        className={`text-[10px] font-extrabold ${tone.text}`}
                      >
                        #{trait}
                      </span>
                    ))}
                  </div>

                  {/* 선택 버튼 */}
                  <button
                    type="button"
                    onClick={() => pick(key)}
                    disabled={isOn}
                    className={`mt-5 inline-flex w-full items-center justify-center gap-1 rounded-2xl py-3.5 text-sm font-black shadow-[0_10px_22px_rgba(44,62,80,0.12)] transition active:scale-[0.98] ${
                      isOn
                        ? 'bg-white border border-navy/10 text-muted'
                        : tone.button
                    }`}
                  >
                    {isOn ? (
                      <>
                        <Check size={15} strokeWidth={3} />이 모드 사용 중
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} strokeWidth={2.6} />
                        {p.displayName} 모드로 풀이받기
                      </>
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[10px] font-bold text-muted leading-relaxed">
          모드 변경 시 그 모드로 생성된 풀이가 없으면 다시 생성해야 해요.
          <br />각 모드의 풀이는 따로 저장돼서 언제든 전환 가능합니다.
        </p>
      </div>
    </main>
  );
}
