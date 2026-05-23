import Link from 'next/link';
import { Card } from '@/components/ui/primitives';
import { dayFortune } from '@/lib/saju/fortune_calendar';
import { buildSajuResult } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';

const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

const GRADE_DOT: Record<'길' | '평' | '주의', string> = {
  길: 'bg-mint',
  평: 'bg-navy/25',
  주의: 'bg-red',
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

export function WeekStrip({ sajuInput }: { sajuInput: SajuInput }) {
  const saju = buildSajuResult(sajuInput);
  const today = todayKstIso();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map(
    (iso) => dayFortune(saju, iso),
  );

  // 이번 주 (오늘 + 6일) 베스트 / 주의 추출
  const best = [...days].sort((a, b) => b.score - a.score)[0];
  const caution = [...days].sort((a, b) => a.score - b.score)[0];

  return (
    <Card className="mt-3 p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-muted">이번 주 흐름</p>
          <h3 className="text-base font-black text-navy">앞으로 7일</h3>
        </div>
        <Link
          href="/calendar"
          prefetch
          className="text-[11px] font-black text-mint-dark"
        >
          전체 달력 →
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const dt = new Date(d.date + 'T00:00:00');
          const isToday = i === 0;
          return (
            <Link
              key={d.date}
              href="/calendar"
              prefetch
              className={`flex flex-col items-center rounded-2xl py-2 transition active:scale-95 ${
                isToday
                  ? 'bg-navy text-white shadow-[0_8px_18px_rgba(44,62,80,0.18)]'
                  : 'bg-ivory text-navy'
              }`}
            >
              <span
                className={`text-[10px] font-extrabold ${isToday ? 'text-white/80' : 'text-muted'}`}
              >
                {WEEKDAY_SHORT[dt.getDay()]}
              </span>
              <span className="mt-0.5 text-sm font-black">
                {dt.getDate()}
              </span>
              <span className={`mt-1 h-1.5 w-1.5 rounded-full ${GRADE_DOT[d.grade]}`} />
              <span
                className={`mt-1 text-[9px] font-black ${
                  isToday ? 'text-white/90' : 'text-muted'
                }`}
              >
                {d.score}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-mint/12 p-2.5">
          <p className="text-[10px] font-extrabold text-mint-dark">
            🌿 7일 중 베스트
          </p>
          <p className="mt-0.5 text-xs font-black text-navy">
            {new Date(best.date + 'T00:00:00').getMonth() + 1}월 {best.day}일 ·{' '}
            {best.score}점
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-muted leading-snug">
            {best.note}
          </p>
        </div>
        <div className="rounded-2xl bg-red/10 p-2.5">
          <p className="text-[10px] font-extrabold text-red">⚠️ 주의일</p>
          <p className="mt-0.5 text-xs font-black text-navy">
            {new Date(caution.date + 'T00:00:00').getMonth() + 1}월{' '}
            {caution.day}일 · {caution.score}점
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-muted leading-snug">
            {caution.note}
          </p>
        </div>
      </div>
    </Card>
  );
}
