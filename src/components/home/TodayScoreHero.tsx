import { Card } from '@/components/ui/primitives';
import { dayFortune, type FortuneGrade } from '@/lib/saju/fortune_calendar';
import { buildSajuResult } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';

interface Props {
  name: string;
  sajuInput: SajuInput;
}

const REL_DAYS = [
  { offset: -2, label: '그제' },
  { offset: -1, label: '어제' },
  { offset: 0, label: '오늘' },
  { offset: 1, label: '내일' },
  { offset: 2, label: '모레' },
] as const;

// 단일 액센트 — 등급별 한 가지 색만 쓴다 (그라데이션 없음).
const GRADE_ACCENT: Record<
  FortuneGrade,
  { ring: string; chip: string; label: string }
> = {
  길: { ring: 'bg-mint/15', chip: 'bg-mint/15 text-[#16706B]', label: '길' },
  평: { ring: 'bg-gold/20', chip: 'bg-gold/25 text-[#7C5A0E]', label: '평' },
  주의: { ring: 'bg-red/12', chip: 'bg-red/15 text-red', label: '주의' },
};

function todayKstIso(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + (540 + now.getTimezoneOffset()) * 60000);
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 오늘 일진 점수 — 순수 계산 결과(LLM 아님)라 거북빵을 열지 않아도 항상 보인다.
 *
 * AI가 쓴 "오늘의 한 줄"과 추천 행동은 거북빵(TurtleBread) 안으로 옮겼다.
 * 여기는 점수와 5일 흐름만 담당한다.
 */
export function TodayScoreHero({ name, sajuInput }: Props) {
  const saju = buildSajuResult(sajuInput);
  const today = todayKstIso();
  const days = REL_DAYS.map((d) => ({
    ...d,
    fortune: dayFortune(saju, addDays(today, d.offset)),
  }));
  const todayFortune = days.find((d) => d.offset === 0)!.fortune;
  const accent = GRADE_ACCENT[todayFortune.grade];

  return (
    <Card className="mt-3 p-5">
      <p className="text-[12px] font-extrabold text-muted">오늘의 흐름</p>
      <h2 className="mt-0.5 text-[20px] font-black leading-tight text-navy">
        {name}님의 일진 점수
      </h2>

      {/* 큰 점수 — 단일 액센트 원 */}
      <div className="mt-5 flex flex-col items-center">
        <div className="relative grid place-items-center">
          <span
            className={`absolute h-24 w-24 translate-x-7 -translate-y-2 rounded-full ${accent.ring}`}
          />
          <span className="relative text-[64px] font-black leading-none text-navy">
            {todayFortune.score}
          </span>
        </div>
        <span
          className={`mt-3 rounded-full px-3 py-1 text-[11px] font-black ${accent.chip}`}
        >
          {accent.label} · 오늘 일진 {todayFortune.note}
        </span>
      </div>

      {/* 그제~모레 5일 점수 */}
      <div className="mt-5 grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const isToday = d.offset === 0;
          return (
            <div
              key={d.offset}
              className={`flex flex-col items-center rounded-2xl py-2 ${
                isToday ? 'bg-navy text-white' : 'bg-ivory text-navy'
              }`}
            >
              <span
                className={`text-[10px] font-extrabold ${isToday ? 'text-white/80' : 'text-muted'}`}
              >
                {d.label}
              </span>
              <span className="mt-1 text-[13px] font-black">
                {d.fortune.score}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
