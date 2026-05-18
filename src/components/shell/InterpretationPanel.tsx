'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Layers3, Sparkles } from 'lucide-react';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { TalismanPanel } from '@/components/shell/TalismanPanel';
import { ButtonPrimary } from '@/components/ui/primitives';
import { CREDIT_COSTS } from '@/lib/credits';
import type { InterpretationCategory } from '@/types/db';

const ANALYSIS_STEPS = [
  {
    at: 0,
    title: '원국 펼치는 중...',
    body: '연월일시 네 기둥을 다시 맞춰보고 있어요.',
  },
  {
    at: 0.14,
    title: '오행 온도 재는 중...',
    body: '목화토금수의 쏠림과 빈자리를 비교하는 중이에요.',
  },
  {
    at: 0.3,
    title: '십성 단서 모으는 중...',
    body: '성향, 관계, 돈, 일의 반복 패턴을 골라내고 있어요.',
  },
  {
    at: 0.48,
    title: '신살 포인트 표시하는 중...',
    body: '체감이 큰 사건성 단서를 조심스럽게 확인하고 있어요.',
  },
  {
    at: 0.66,
    title: '대운 흐름 연결하는 중...',
    body: '지금 시기와 앞으로의 큰 흐름을 이어 보고 있어요.',
  },
  {
    at: 0.82,
    title: '리포트 문장 다듬는 중...',
    body: '표, 체크포인트, 활용 처방까지 읽기 좋게 정리하고 있어요.',
  },
  {
    at: 0.95,
    title: '거의 다 됐어요...',
    body: '응답을 받는 대로 바로 리포트 화면에 꽂아둘게요.',
  },
];

const EXPECTED_ANALYSIS_MS = 48_000;

const CATEGORY_DEEP_DIVES: Partial<
  Record<
    InterpretationCategory,
    Array<{ title: string; subtitle: string; focus: string }>
  >
> = {
  overview: [
    {
      title: '인생 테마 더 파기',
      subtitle: '원국 전체에서 반복되는 핵심 선택 패턴',
      focus:
        '원국 전체의 반복 테마, 삶에서 자주 마주치는 선택 패턴, 장기적으로 키워야 할 무기',
    },
    {
      title: '위험 신호 정밀 보기',
      subtitle: '무리할 때 먼저 무너지는 지점',
      focus:
        '오행 과다와 부족에서 생기는 위험 신호, 관계와 일에서 무리할 때 나타나는 조짐',
    },
    {
      title: '10년 활용 전략',
      subtitle: '대운 흐름에 맞춘 현실 전략',
      focus:
        '현재와 다음 대운에서 유리한 선택, 피해야 할 선택, 기운을 쓰는 우선순위',
    },
  ],
  ohaeng: [
    {
      title: '오행 결핍 처방',
      subtitle: '부족한 기운을 채우는 생활 루틴',
      focus:
        '오행 중 부족한 기운이 현실에서 어떻게 드러나는지, 색상/공간/관계/습관으로 보완하는 방법',
    },
    {
      title: '강한 기운 사용법',
      subtitle: '장점으로 쓰일 때와 과할 때 구분',
      focus:
        '가장 강한 오행이 장점으로 작동하는 장면과 과해져서 문제를 만드는 장면의 차이',
    },
    {
      title: '컨디션 온도 지도',
      subtitle: '피로와 회복 패턴을 오행으로 보기',
      focus:
        '오행 균형이 컨디션, 감정 기복, 회복 루틴에 미치는 영향과 실전 관리법',
    },
  ],
  ilju: [
    {
      title: '일주 성향 깊게 보기',
      subtitle: '자존감과 선택 기준의 뿌리',
      focus: '일간과 일지가 만드는 본질, 자존심, 관계에서 양보하기 어려운 기준',
    },
    {
      title: '사랑 방식 판독',
      subtitle: '가까워질 때 드러나는 반응',
      focus:
        '일주 기준 사랑받고 싶은 방식, 친밀감이 깊어질 때 나오는 말과 행동 패턴',
    },
    {
      title: '일주 활용 처방',
      subtitle: '타고난 기질을 무기로 바꾸기',
      focus:
        '일주의 강점을 일, 관계, 돈의 현실 선택에서 더 생산적으로 쓰는 방법',
    },
  ],
  strength: [
    {
      title: '강점 랭킹',
      subtitle: '가장 돈이 되는 장점부터 보기',
      focus:
        '사주에서 드러나는 강점을 현실 활용도 기준으로 우선순위화하고 돈/성과와 연결하는 방법',
    },
    {
      title: '인정받는 장면',
      subtitle: '남들이 나를 찾는 이유',
      focus:
        '타인이 사용자를 신뢰하고 찾게 되는 장면, 강점이 드러나는 말투와 행동',
    },
    {
      title: '강점 과사용 경고',
      subtitle: '잘하는 것이 부담이 되는 순간',
      focus: '타고난 장점을 과하게 쓸 때 피로와 갈등으로 바뀌는 신호와 조절법',
    },
  ],
  weakness: [
    {
      title: '약점 트리거',
      subtitle: '흔들리는 순간의 공통 조건',
      focus: '약점이 튀어나오는 상황, 사람, 말, 환경의 공통 조건과 조기 신호',
    },
    {
      title: '갈등 방어법',
      subtitle: '말과 행동이 커지기 전 멈추는 법',
      focus:
        '관계와 일에서 약점이 갈등으로 커지기 전 멈추는 대화법과 행동 처방',
    },
    {
      title: '약점을 재능으로 전환',
      subtitle: '민감함과 고집을 장점으로 쓰기',
      focus:
        '부족하거나 과한 기질을 완전히 고치는 대신 역할과 환경을 바꿔 장점으로 쓰는 방법',
    },
  ],
  personality: [
    {
      title: '겉과 속 차이',
      subtitle: '남이 보는 나와 진짜 속마음',
      focus: '외부에 보이는 성격과 실제 내면 욕구의 차이, 오해가 생기는 이유',
    },
    {
      title: '감정 처리 방식',
      subtitle: '참는지, 터지는지, 피하는지',
      focus: '감정이 올라올 때의 처리 방식, 스트레스 반응, 회복에 필요한 조건',
    },
    {
      title: '성격 사용 설명서',
      subtitle: '관계에서 편해지는 말투와 루틴',
      focus:
        '사용자 성격에 맞는 소통법, 부탁하는 방식, 거절하는 방식, 관계 유지 루틴',
    },
  ],
  love: [
    {
      title: '상대 유형 정밀 판독',
      subtitle: '끌리는 사람과 오래 가는 사람 구분',
      focus:
        '연애와 결혼에서 잘 맞는 상대의 오행, 일간 성향, 소통 방식, 피해야 할 상대 유형',
    },
    {
      title: '결혼 타이밍 보기',
      subtitle: '결정하기 좋은 시기와 신중해야 할 때',
      focus:
        '대운과 원국 기준으로 연애 안정기, 결혼 결정 타이밍, 관계가 흔들리는 시기',
    },
    {
      title: '반복 연애 패턴 교정',
      subtitle: '불안, 거리감, 집착의 원인과 처방',
      focus: '반복되는 연애 실수, 감정 반응 패턴, 갈등 시 말투와 행동 처방',
    },
  ],
  career: [
    {
      title: '직업 적합도 랭킹',
      subtitle: '잘 맞는 일의 구조를 우선순위로',
      focus:
        '사주 기준 직업군 적합도, 조직/독립/전문직/콘텐츠형 업무의 우선순위',
    },
    {
      title: '이직 타이밍',
      subtitle: '움직일 때와 버틸 때 구분',
      focus:
        '대운과 현재 흐름 기준 이직, 전환, 창업을 판단하는 시기와 위험 신호',
    },
    {
      title: '성과 나는 방식',
      subtitle: '일하는 루틴과 협업 처방',
      focus:
        '성과가 나는 업무 방식, 피로가 쌓이는 협업 구조, 상사/동료와의 관계 전략',
    },
  ],
  wealth: [
    {
      title: '돈 새는 패턴',
      subtitle: '반복 지출과 감정 소비 분석',
      focus:
        '재물운에서 돈이 모이는 방식과 새는 방식, 감정 소비와 투자 판단의 약점',
    },
    {
      title: '수익 구조 설계',
      subtitle: '월급, 부업, 투자 중 맞는 방향',
      focus:
        '사주 기준 안정 수입, 부업, 사업, 투자 중 유리한 돈의 구조와 우선순위',
    },
    {
      title: '재물운 타이밍',
      subtitle: '모으고 쓰고 지킬 때',
      focus: '대운 흐름 기준 돈을 모을 때, 확장할 때, 지켜야 할 때의 차이',
    },
  ],
  family: [
    {
      title: '가족 역할 분석',
      subtitle: '집안에서 맡기 쉬운 자리',
      focus:
        '가족 안에서 자연스럽게 맡게 되는 역할, 책임감, 기대와 부담의 흐름',
    },
    {
      title: '부모와의 거리감',
      subtitle: '가까워도 힘든 이유',
      focus:
        '부모와의 관계에서 반복되는 감정, 독립과 의무 사이의 균형, 말이 막히는 지점',
    },
    {
      title: '가족 갈등 처방',
      subtitle: '선 넘지 않고 지키는 관계법',
      focus: '가족 갈등이 커지는 조건, 경계를 세우는 말, 현실적인 거리 조절법',
    },
  ],
  friends: [
    {
      title: '좋은 인연 구분',
      subtitle: '나를 키우는 사람의 특징',
      focus:
        '사용자에게 도움이 되는 친구와 동료의 특징, 오래 가는 인연의 오행과 십성 단서',
    },
    {
      title: '소모되는 관계',
      subtitle: '에너지가 빠지는 사람 알아보기',
      focus:
        '관계에서 에너지가 새는 패턴, 피해야 할 사람 유형, 거리를 둘 타이밍',
    },
    {
      title: '관계 확장 전략',
      subtitle: '인맥운이 좋아지는 방식',
      focus: '대인관계 운을 넓히는 환경, 모임, 말투, 협업 방식과 주의점',
    },
  ],
  direction: [
    {
      title: '개운 루틴 설계',
      subtitle: '색, 공간, 습관으로 기운 보완',
      focus:
        '부족한 기운을 보완하는 색상, 공간, 시간대, 생활 루틴을 현실적으로 설계',
    },
    {
      title: '좋은 방향 활용법',
      subtitle: '집, 일, 이동에서 써먹기',
      focus:
        '방향과 환경이 컨디션과 선택에 미치는 영향, 집/업무/이동에서 적용하는 법',
    },
    {
      title: '막힐 때 회복법',
      subtitle: '운이 답답할 때 푸는 순서',
      focus: '운이 막히는 시기에 먼저 정리할 환경, 관계, 루틴, 마음가짐의 순서',
    },
  ],
};

const DEFAULT_DEEP_DIVES = [
  {
    title: '체감 포인트 더 보기',
    subtitle: '내 현실에서 맞춰볼 구체 장면',
    focus:
      '사용자가 현실에서 바로 체감할 수 있는 구체 장면, 체크 질문, 반복 패턴',
  },
  {
    title: '주의점 더 보기',
    subtitle: '실수하기 쉬운 지점과 방어법',
    focus: '이 카테고리에서 실수하기 쉬운 지점, 위험 신호, 갈등 예방 처방',
  },
  {
    title: '실전 처방 더 보기',
    subtitle: '오늘부터 바꿀 루틴과 선택 기준',
    focus: '생활 루틴, 관계 방식, 선택 기준으로 바로 적용 가능한 실전 처방',
  },
];

function errorMessage(code: string): string {
  if (code === 'llm_not_configured') return 'AI 키 설정이 아직 안 되어 있어요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  if (code === 'unauthorized') return '로그인이 필요해요.';
  if (code === 'insufficient_credits') return '크래딧이 부족해요.';
  return '해설을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

function loadingProgress(elapsedMs: number) {
  const raw = elapsedMs / EXPECTED_ANALYSIS_MS;
  if (raw >= 1) return 95;
  return Math.max(8, Math.round(raw * 92));
}

function loadingStepIndex(progress: number) {
  const ratio = progress / 100;
  let index = 0;
  for (let i = 0; i < ANALYSIS_STEPS.length; i += 1) {
    if (ratio >= ANALYSIS_STEPS[i].at) index = i;
  }
  return index;
}

function AnalysisLoadingIndicator({ elapsedMs }: { elapsedMs: number }) {
  const progress = loadingProgress(elapsedMs);
  const stepIndex = loadingStepIndex(progress);
  const step = ANALYSIS_STEPS[stepIndex];
  const secondsLeft = Math.max(
    0,
    Math.ceil((EXPECTED_ANALYSIS_MS - elapsedMs) / 1000),
  );

  return (
    <div
      className="overflow-hidden rounded-3xl border border-mint/35 bg-gradient-to-br from-mint/18 via-white to-gold/18 p-4 shadow-[0_12px_28px_rgba(44,62,80,0.08)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy text-white">
          <Sparkles size={20} strokeWidth={2.5} />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gold shadow-[0_0_0_4px_rgba(244,208,63,0.22)] animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-mint-dark">
            AI 상세 분석 업데이트 중
          </p>
          <p className="mt-1 text-base font-black text-navy">{step.title}</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            {step.body}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-navy/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint to-gold transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-black text-muted">
        <span>예상 {Math.round(EXPECTED_ANALYSIS_MS / 1000)}초 안팎</span>
        <span>
          {progress >= 95 ? '마지막 응답 대기' : `약 ${secondsLeft}초 남음`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ANALYSIS_STEPS.slice(0, -1).map((item, index) => {
          const active = index <= stepIndex;
          const current = index === stepIndex;
          return (
            <div
              key={item.title}
              className={`rounded-xl px-2 py-1.5 text-center text-[10px] font-black transition ${
                current
                  ? 'bg-navy text-white'
                  : active
                    ? 'bg-mint/18 text-navy'
                    : 'bg-white/70 text-muted/70'
              }`}
            >
              {item.title.replace('...', '')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeepDivePanel({
  category,
  onSelect,
  disabled,
}: {
  category: InterpretationCategory;
  onSelect: (focus: string) => void;
  disabled: boolean;
}) {
  const options = CATEGORY_DEEP_DIVES[category] ?? DEFAULT_DEEP_DIVES;

  return (
    <div className="rounded-3xl border border-navy/10 bg-white/80 p-4 shadow-[0_10px_24px_rgba(44,62,80,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/30 text-navy">
          <Layers3 size={20} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-navy">
            여기서 더 정밀하게 볼 수 있어
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            방금 리포트에서 더 궁금한 지점을 골라 초점을 좁혀볼 수 있어. 심화
            분석은 주제별로 크래딧 {CREDIT_COSTS.interpretation}개를 사용해.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((option) => (
          <button
            key={option.title}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.focus)}
            className="flex w-full items-center gap-3 rounded-2xl border border-navy/10 bg-ivory/70 px-3 py-3 text-left transition active:scale-[0.99] disabled:opacity-60"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-navy">
                {option.title}
              </span>
              <span className="mt-0.5 block text-[11px] font-bold leading-relaxed text-muted">
                {option.subtitle}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-mint/20 px-2.5 py-1 text-[10px] font-black text-navy">
              {CREDIT_COSTS.interpretation} 크래딧
            </span>
            <ArrowRight
              size={16}
              strokeWidth={3}
              className="shrink-0 text-muted"
            />
          </button>
        ))}
      </div>

      <Link
        href="/more/pro"
        className="mt-3 block rounded-2xl bg-navy px-4 py-3 text-center text-sm font-black text-white"
      >
        크래딧 충전하고 계속 보기
      </Link>
    </div>
  );
}

export function InterpretationPanel({
  category,
  initialContent,
}: {
  category: InterpretationCategory;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeFocus, setActiveFocus] = useState('');
  const [error, setError] = useState('');
  const isRichReport =
    content.includes('##') || content.includes('| 사주 근거 |');

  useEffect(() => {
    if (!loading) return;

    const timer = window.setInterval(() => {
      setElapsedMs((current) => current + 500);
    }, 500);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function generate(focus?: string) {
    setLoading(true);
    setElapsedMs(0);
    setActiveFocus(focus ?? '');
    setError('');
    try {
      const res = await fetch('/api/interpretations/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, focus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'unknown',
        );
      setContent(typeof data.content === 'string' ? data.content : '');
    } catch (e) {
      setError(errorMessage(e instanceof Error ? e.message : 'unknown'));
    } finally {
      setLoading(false);
      setActiveFocus('');
    }
  }

  if (!content) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-black text-navy">
            AI 정밀 리포트가 아직 없어
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            크래딧을 사용하면 원국 근거, 표, 체감 체크포인트까지 묶어서 깊게
            풀어줄게.
          </p>
        </div>
        {loading && <AnalysisLoadingIndicator elapsedMs={elapsedMs} />}
        <ButtonPrimary
          tone="mint"
          onClick={() => generate()}
          disabled={loading}
        >
          {loading
            ? ANALYSIS_STEPS[loadingStepIndex(loadingProgress(elapsedMs))].title
            : `크래딧 ${CREDIT_COSTS.interpretation}개로 해설 생성`}
        </ButtonPrimary>
        {error && (
          <p className="text-center text-xs font-bold text-red">
            {error}{' '}
            {error.includes('크래딧') && (
              <Link href="/more/pro" className="underline underline-offset-4">
                충전하기
              </Link>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {!isRichReport && (
        <div className="mb-4 rounded-2xl bg-gold/15 px-4 py-3">
          <p className="text-xs font-black text-[#6B5A24]">
            새 정밀 리포트 형식 사용 가능
          </p>
          <p className="mt-1 text-[12px] font-bold leading-relaxed text-muted">
            다시 생성하면 판독 근거표와 체감 체크포인트가 포함된 새 형식으로
            정리돼.
          </p>
        </div>
      )}
      <InterpretationBody text={content} />
      <div className="mt-5 space-y-3">
        {loading && <AnalysisLoadingIndicator elapsedMs={elapsedMs} />}
        {!loading && <TalismanPanel category={category} />}
        {!loading && (
          <DeepDivePanel
            category={category}
            onSelect={generate}
            disabled={loading}
          />
        )}
        <ButtonPrimary
          tone="mint"
          onClick={() => generate()}
          disabled={loading}
        >
          {loading
            ? activeFocus
              ? '심화 초점으로 다시 읽는 중...'
              : ANALYSIS_STEPS[loadingStepIndex(loadingProgress(elapsedMs))]
                  .title
            : `크래딧 ${CREDIT_COSTS.interpretation}개로 정밀 리포트 생성`}
        </ButtonPrimary>
        {error && (
          <p className="mt-2 text-center text-xs font-bold text-red">{error}</p>
        )}
      </div>
    </div>
  );
}
