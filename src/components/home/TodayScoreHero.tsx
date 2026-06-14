import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { EnsureDaily } from '@/components/home/EnsureDaily';
import { dayFortune, type FortuneGrade } from '@/lib/saju/fortune_calendar';
import { buildSajuResult } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';

interface Props {
  name: string;
  sajuInput: SajuInput;
  sajuId: string;
  /** AI 생성된 오늘의 한 줄 (없으면 EnsureDaily가 생성 트리거) */
  oneLiner: string | null;
  /** 추천 행동 (있으면 최대 3개 노출) */
  recommend: string[];
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
 * 점신식 "오늘 점수" 히어로. 한 화면의 단일 초점.
 *
 * 큰 점수 + 그제~모레 5일 셀렉터 + 오늘 한 줄 + 추천을 하나의 클린 카드로 묶어
 * 기존의 (일진 스프라이트 카드 + 한 줄 카드 + 주간 스트립) 3장을 1장으로 합친다.
 * 그라데이션 없이 플랫 화이트 + 등급 단일 액센트만 사용.
 */
export function TodayScoreHero({
  name,
  sajuInput,
  sajuId,
  oneLiner,
  recommend,
}: Props) {
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
      {/* eyebrow + title */}
      <p className="text-[12px] font-extrabold text-muted">오늘의 운세</p>
      <h2 className="mt-0.5 text-[22px] font-black leading-tight text-navy">
        {name}님의 오늘 흐름
      </h2>

      {/* 그제~모레 5일 셀렉터 */}
      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const isToday = d.offset === 0;
          return (
            <Link
              key={d.offset}
              href="/calendar"
              prefetch
              className={`flex flex-col items-center rounded-2xl py-2 transition active:scale-95 ${
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
            </Link>
          );
        })}
      </div>

      {/* 큰 점수 — 단일 액센트 원 */}
      <div className="mt-6 flex flex-col items-center">
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

      {/* 오늘의 한 줄 */}
      <div className="mt-5 rounded-2xl bg-ivory px-4 py-3.5">
        <p className="text-[11px] font-extrabold text-muted">오늘의 한 줄</p>
        <p className="mt-1 text-[15px] font-black leading-snug text-navy">
          {oneLiner ? (
            oneLiner
          ) : (
            <>
              오늘의 운세를 가져오는 중이야
              <LoadingDots />
            </>
          )}
        </p>
        {recommend.length > 0 && (
          <ul className="mt-2.5 space-y-1 text-[12px] font-bold text-[#3C4650]">
            {recommend.slice(0, 3).map((r) => (
              <li key={r} className="leading-snug">
                ✓ {r}
              </li>
            ))}
          </ul>
        )}
        {oneLiner && (
          // 진짜 손실회피: 일진은 실제로 날짜 경계로 바뀜(거짓 만료 아님).
          <p className="mt-2.5 text-[11px] font-bold text-mint-dark">
            오늘의 일진은 오늘만 · 내일이면 새 흐름이에요
          </p>
        )}
        {!oneLiner && <EnsureDaily sajuId={sajuId} />}
      </div>

      {/* CTA */}
      <Link
        href="/shell"
        prefetch
        className="mt-4 flex items-center justify-center gap-1 rounded-2xl bg-navy py-3.5 text-[14px] font-black text-white active:scale-[0.99]"
      >
        오늘 하루 자세히 보기
        <ChevronRight size={16} strokeWidth={3} />
      </Link>
    </Card>
  );
}
