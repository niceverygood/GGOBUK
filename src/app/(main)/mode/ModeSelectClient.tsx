'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Lock, Sparkles } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Badge, Card } from '@/components/ui/primitives';
import {
  PERSONAS,
  PERSONA_ORDER,
  PERSONA_EXPERTISE_LEVEL,
  type PersonaKey,
} from '@/lib/llm/personas';
import { readPersonaMode, writePersonaMode } from '@/lib/utils/persona-mode';
import {
  isAnyGenerationLocked,
  subscribeGenerationLock,
} from '@/lib/utils/generation-lock';

interface InterpStyle {
  reader: string;
  jargon: string;
  structure: string;
  length: string;
  endsWith: string;
}

const INTERP_STYLE: Record<PersonaKey, InterpStyle> = {
  kkobuk: {
    reader: '사주 지식 전혀 없는 일반인',
    jargon: '한자·명리 술어 모두 일상어로 풀이',
    structure: '흐르는 평문 (표·헤딩 ❌)',
    length: '800–1,200자',
    endsWith: '오늘 해볼 작은 행동 한 가지',
  },
  mudang: {
    reader: '일반인 · 빠른 진단 원하는 사람',
    jargon: '핵심 술어만 1회 풀이, 한자 ❌',
    structure: '짧은 평문 4–5단락, 결단형',
    length: '600–1,000자',
    endsWith: '시점·데드라인 박힌 행동 지시',
  },
  bosal: {
    reader: '사주 어느 정도 아는 중급자',
    jargon: '핵심 한자 살짝, 술어는 위로에 녹임',
    structure: '평문 4–5단락 (공감 우선)',
    length: '1,000–1,500자',
    endsWith: '오늘 해볼 작은 친절 한 가지',
  },
  dosa: {
    reader: '명리 깊이 아는 전문가',
    jargon: '한자(漢字) 정식 병기, 격국·용신·통근·합충',
    structure: '판독 근거 표 + 체크포인트 + 깊은 풀이 + 활용 처방',
    length: '2,400–3,400자',
    endsWith: '4-섹션 정식 리포트',
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCurrent(readPersonaMode());
  }, []);

  useEffect(() => {
    setBusy(isAnyGenerationLocked());
    return subscribeGenerationLock(() => setBusy(isAnyGenerationLocked()));
  }, []);

  async function pick(key: PersonaKey) {
    if (busy) return; // hard guard — buttons are also disabled
    setCurrent(key);
    writePersonaMode(key);
    const from = searchParams.get('from');

    // 채팅에서 왔다면 새 페르소나로 새 채팅 세션을 만들어 거기로 이동.
    // 기존 세션은 그 세션의 persona 그대로 두고, 모드 변경은 "지금부터 다른
    // 캐릭터와 새 대화"로 자연스럽게 연결되게 한다.
    if (from && from.startsWith('/chat')) {
      try {
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona: key }),
        });
        const d = await res.json().catch(() => ({}));
        if (d?.session?.id) {
          router.replace(`/chat/${d.session.id}`);
          return;
        }
      } catch {
        // 실패 시 그냥 /chat 으로 (fallback)
      }
      router.replace('/chat');
      return;
    }

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
            톤뿐 아니라 <span className="text-navy">해석 깊이</span>도 달라요.
            앞으로 갈수록 일반인도 쉽게, 뒤로 갈수록 전문 명리 용어로 깊이 있게
            풀어줍니다.
          </p>

          {/* Expertise gradient legend */}
          <div className="mt-3 rounded-2xl border border-navy/8 bg-white/85 p-3">
            <p className="text-[10px] font-extrabold text-muted">
              전문성 그라데이션
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] font-black text-mint-dark">쉬움</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gradient-to-r from-mint via-red/70 via-gold to-navy">
                <span className="sr-only">왼쪽 일반인 → 오른쪽 전문가</span>
              </div>
              <span className="text-[10px] font-black text-navy">전문가</span>
            </div>
            <div className="mt-1.5 grid grid-cols-4 text-center text-[9px] font-extrabold text-muted">
              <span>꼬북이</span>
              <span>꼬북무당</span>
              <span>꼬북보살</span>
              <span>꼬북도사</span>
            </div>
          </div>
        </div>

        {busy && (
          <div className="mt-4 rounded-2xl bg-gold/25 border border-gold/40 px-4 py-3 text-xs font-black text-[#5A4A20]">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={13} strokeWidth={3} />
              리포트 생성 중이라 지금은 모드를 바꿀 수 없어요. 생성이 끝난 뒤
              다시 시도해주세요.
            </span>
          </div>
        )}

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
                        {/* Expertise level meter (★1~4) */}
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-[10px] font-extrabold text-muted">
                            전문성
                          </span>
                          <span className="text-[11px] font-black text-navy tracking-wider">
                            {'★'.repeat(PERSONA_EXPERTISE_LEVEL[key])}
                            <span className="text-navy/20">
                              {'★'.repeat(4 - PERSONA_EXPERTISE_LEVEL[key])}
                            </span>
                          </span>
                          <span className="text-[10px] font-extrabold text-muted">
                            {PERSONA_EXPERTISE_LEVEL[key] === 1
                              ? '입문'
                              : PERSONA_EXPERTISE_LEVEL[key] === 2
                                ? '일반'
                                : PERSONA_EXPERTISE_LEVEL[key] === 3
                                  ? '중급'
                                  : '전문가'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[12px] font-bold leading-relaxed text-navy">
                    {p.backstory}
                  </p>

                  {/* 풀이 스타일 spec grid */}
                  <div className="mt-4 space-y-2">
                    <div className={`rounded-2xl ${tone.softBg} p-2.5`}>
                      <p className={`text-[10px] font-extrabold ${tone.text}`}>
                        🎯 누구를 위한 풀이
                      </p>
                      <p className="mt-0.5 text-[11px] font-black text-navy leading-snug">
                        {style.reader}
                      </p>
                    </div>
                    <div className={`rounded-2xl ${tone.softBg} p-2.5`}>
                      <p className={`text-[10px] font-extrabold ${tone.text}`}>
                        🈯️ 한자·명리 술어
                      </p>
                      <p className="mt-0.5 text-[11px] font-black text-navy leading-snug">
                        {style.jargon}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
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
                    disabled={isOn || busy}
                    className={`mt-5 inline-flex w-full items-center justify-center gap-1 rounded-2xl py-3.5 text-sm font-black shadow-[0_10px_22px_rgba(44,62,80,0.12)] transition active:scale-[0.98] ${
                      isOn
                        ? 'bg-white border border-navy/10 text-muted'
                        : busy
                          ? 'bg-white border border-navy/10 text-muted opacity-60 cursor-not-allowed'
                          : tone.button
                    }`}
                  >
                    {isOn ? (
                      <>
                        <Check size={15} strokeWidth={3} />이 모드 사용 중
                      </>
                    ) : busy ? (
                      <>
                        <Lock size={15} strokeWidth={2.6} />
                        생성 중 — 잠시 후 시도
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
