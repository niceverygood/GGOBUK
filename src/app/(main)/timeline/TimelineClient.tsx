'use client';

import { useState } from 'react';
import { LifeRoad } from '@/components/timeline/LifeRoad';
import { ColdReadCard } from '@/components/timeline/ColdReadCard';
import { Badge, Card } from '@/components/ui/primitives';
import type { DaewoonPeriod } from '@/lib/saju/types';

interface TimelineClientProps {
  daewoon: DaewoonPeriod[];
}

const SIPSUNG_META: Record<
  string,
  {
    theme: string;
    description: string;
    watch: string;
    action: string;
  }
> = {
  비견: {
    theme: '내 기준을 세우는 10년',
    description: '독립심과 자존감이 커지고, 직접 선택해야 할 일이 많아져요.',
    watch: '고집과 혼자 버티기',
    action: '내 이름으로 책임질 일을 정리하기',
  },
  겁재: {
    theme: '경쟁 속에서 판을 키우는 10년',
    description: '사람, 돈, 기회가 빠르게 오가며 승부 감각이 중요해져요.',
    watch: '무리한 확장과 지출',
    action: '같이 갈 사람과 거리 둘 사람 구분하기',
  },
  식신: {
    theme: '재능을 꾸준히 결과로 만드는 10년',
    description: '표현력, 콘텐츠, 먹고사는 기술이 안정적으로 자라요.',
    watch: '편안함에 머무르기',
    action: '작게라도 계속 내보내는 루틴 만들기',
  },
  상관: {
    theme: '낡은 틀을 깨고 드러나는 10년',
    description: '말, 기획, 창작 능력이 강해지고 새 방식으로 인정받기 쉬워요.',
    watch: '말의 날카로움과 규칙 충돌',
    action: '아이디어를 결과물로 정리하기',
  },
  편재: {
    theme: '기회와 돈의 폭이 넓어지는 10년',
    description: '관계망, 영업력, 시장 감각이 커져 움직인 만큼 기회가 붙어요.',
    watch: '분산과 빠른 소진',
    action: '돈보다 신뢰가 남는 선택하기',
  },
  정재: {
    theme: '현실 기반을 단단히 쌓는 10년',
    description:
      '저축, 계약, 안정적인 수입 구조처럼 손에 잡히는 결실이 중요해요.',
    watch: '안전한 선택만 고집하기',
    action: '반복 수익과 생활 리듬 정비하기',
  },
  편관: {
    theme: '책임과 검증을 통과하는 10년',
    description: '압박은 커지지만 역할, 직함, 신뢰도 함께 커지는 시기예요.',
    watch: '조급함과 과한 긴장',
    action: '기준을 세우고 오래 갈 실력 쌓기',
  },
  정관: {
    theme: '평판과 질서가 자리를 잡는 10년',
    description:
      '커리어, 제도, 약속의 힘이 강해지고 안정된 이름을 얻기 좋아요.',
    watch: '체면 때문에 늦어지는 결정',
    action: '공식적인 관계와 계약을 정돈하기',
  },
  편인: {
    theme: '감각과 공부가 깊어지는 10년',
    description:
      '보이지 않는 흐름을 읽고, 새로운 지식이나 분야로 방향이 열려요.',
    watch: '생각만 많아지는 흐름',
    action: '배운 것을 현실 도구로 바꾸기',
  },
  정인: {
    theme: '보호와 배움으로 회복하는 10년',
    description: '도움, 자격, 공부, 귀인의 지원이 들어오며 기반을 다시 다져요.',
    watch: '받기만 하고 미루기',
    action: '자격과 기록으로 신뢰 쌓기',
  },
};

function periodTitle(period: DaewoonPeriod, currentYear: number): string {
  if (currentYear >= period.startYear && currentYear <= period.startYear + 9) {
    return '지금 지나고 있는 대운';
  }
  if (period.startYear > currentYear) return '앞으로 준비할 대운';
  return '이미 지나온 대운';
}

function getMeta(period: DaewoonPeriod) {
  return (
    SIPSUNG_META[period.sipsung] ?? {
      theme: '10년 흐름을 살펴보는 구간',
      description: '이 시기의 중심 기운과 현실에서 나타나는 변화를 함께 봐요.',
      watch: '흐름을 놓치는 것',
      action: '반복되는 패턴을 기록하기',
    }
  );
}

export function TimelineClient({ daewoon }: TimelineClientProps) {
  const currentYear = new Date().getFullYear();
  const currentPeriod =
    daewoon.find(
      (p) => currentYear >= p.startYear && currentYear <= p.startYear + 9,
    ) ??
    daewoon[0] ??
    null;
  const [selected, setSelected] = useState<DaewoonPeriod | null>(() => {
    return currentPeriod;
  });

  const currentAge = currentPeriod
    ? currentYear - currentPeriod.startYear + currentPeriod.startAge
    : 0;
  const selectedMeta = selected ? getMeta(selected) : null;

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-muted">
              10년 단위 인생 흐름
            </p>
            <h1 className="text-2xl font-black tracking-tight text-navy">
              대운 타임라인
            </h1>
          </div>
          <Badge tone="mint">현재 {currentAge}세</Badge>
        </div>

        <Card soft className="mt-4 p-4">
          <p className="text-sm font-black text-navy">
            대운은 10년짜리 인생 날씨야
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            매일의 운세가 오늘의 날씨라면, 대운은 10년 동안 깔리는 큰 계절이야.
            아래 지도에서 지금 위치와 다음 흐름, 조심할 점을 눌러 확인할 수
            있어.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['현재 위치', '지금 왜 이런 일이 잦은지'],
              ['다음 10년', '미리 준비할 방향'],
              ['꼬북 해설', '내 사주와 연결한 풀이'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-white/75 px-2 py-3">
                <p className="text-[11px] font-black text-navy">{title}</p>
                <p className="mt-1 text-[10px] font-bold leading-snug text-muted">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-5 px-3 py-4">
          {selected && selectedMeta && (
            <div className="px-1">
              <p className="text-[11px] font-black text-mint-dark">
                {periodTitle(selected, currentYear)}
              </p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-black leading-tight text-navy">
                    <span className="font-hanja">
                      {selected.pillar.ganHanja}
                      {selected.pillar.jiHanja}
                    </span>{' '}
                    대운 · {selected.sipsung}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {selected.startYear}–{selected.startYear + 9} ·{' '}
                    {selected.startAge}–{selected.startAge + 9}세
                  </p>
                </div>
                <Badge
                  tone="gold"
                  className="max-w-[128px] shrink-0 justify-center text-center leading-tight"
                >
                  핵심 {selected.sipsung}
                </Badge>
              </div>
            </div>
          )}
          <LifeRoad
            periods={daewoon}
            currentYear={currentYear}
            selectedStartYear={selected?.startYear ?? null}
            onSelect={setSelected}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-mint/10 px-3 py-3">
              <p className="text-[11px] font-black text-mint-dark">실선</p>
              <p className="mt-1 text-[11px] font-bold leading-snug text-muted">
                지나온 흐름과 지금 이어지는 구간
              </p>
            </div>
            <div className="rounded-2xl bg-gold/20 px-3 py-3">
              <p className="text-[11px] font-black text-[#6B5A24]">흐린 칸</p>
              <p className="mt-1 text-[11px] font-bold leading-snug text-muted">
                앞으로 준비할 다음 10년
              </p>
            </div>
          </div>
        </Card>

        {selected && selectedMeta && (
          <>
            <Card className="mt-4 p-4">
              <p className="text-[11px] font-black text-muted">
                이 구간에서 보는 것
              </p>
              <h2 className="mt-1 text-lg font-black text-navy">
                {selectedMeta.theme}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#82786D]">
                {selectedMeta.description}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-red/10 px-3 py-3">
                  <p className="text-[11px] font-black text-red">주의할 점</p>
                  <p className="mt-1 text-xs font-bold leading-snug text-navy">
                    {selectedMeta.watch}
                  </p>
                </div>
                <div className="rounded-2xl bg-mint/10 px-3 py-3">
                  <p className="text-[11px] font-black text-mint-dark">
                    활용법
                  </p>
                  <p className="mt-1 text-xs font-bold leading-snug text-navy">
                    {selectedMeta.action}
                  </p>
                </div>
              </div>
            </Card>
            <ColdReadCard period={selected} />
          </>
        )}
      </div>
    </main>
  );
}
