"use client";

import { useRef, useEffect, useMemo } from "react";
import type { DaewoonPeriod, SajuResult } from "@/lib/saju/types";
import {
  daewoonFortune,
  GRADE_COLOR,
  OHAENG_COLOR,
} from "@/lib/saju/daewoon_fortune";
import { cn } from "@/lib/utils/cn";

const EMOJI_BY_SIPSUNG: Record<string, string> = {
  비견: "🐢",
  겁재: "🔥",
  식신: "📘",
  상관: "🎤",
  편재: "💰",
  정재: "💼",
  편관: "⚔",
  정관: "🏛",
  편인: "🌱",
  정인: "📜",
};

function periodState(p: DaewoonPeriod, currentYear: number): string {
  if (currentYear >= p.startYear && currentYear <= p.startYear + 9)
    return "현재";
  if (p.startYear > currentYear) return "다음";
  return "지난";
}

export function LifeRoad({
  saju,
  periods,
  currentYear,
  selectedStartYear,
  onSelect,
}: {
  saju: SajuResult;
  periods: DaewoonPeriod[];
  currentYear: number;
  selectedStartYear: number | null;
  onSelect: (p: DaewoonPeriod) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 각 대운의 길흉 점수·오행 색을 한 번에 계산
  const fortunes = useMemo(
    () => periods.map((p) => daewoonFortune(saju, p)),
    [saju, periods],
  );

  // Auto-center the current period on first paint.
  useEffect(() => {
    if (!scrollRef.current) return;
    const currIdx = periods.findIndex(
      (p) => currentYear >= p.startYear && currentYear <= p.startYear + 9,
    );
    if (currIdx >= 0) {
      const target = currIdx * 104 - 116;
      scrollRef.current.scrollTo({
        left: Math.max(0, target),
        behavior: "smooth",
      });
    }
  }, [periods, currentYear]);

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar overflow-x-auto overflow-y-visible pt-2 pb-4"
    >
      <div
        className="relative"
        style={{ width: `${periods.length * 104 + 54}px`, height: "234px" }}
      >
        <div
          className="absolute top-[58px] z-0 h-3 rounded-full"
          style={{
            left: "30px",
            right: "34px",
            background:
              "linear-gradient(90deg, #6FD8D0, #F4D03F, rgba(44,62,80,0.18))",
          }}
        />
        {periods.map((p, i) => {
          const isPast = p.startYear + 9 < currentYear;
          const isCurrent =
            currentYear >= p.startYear && currentYear <= p.startYear + 9;
          const isSelected = selectedStartYear === p.startYear;
          const emoji = EMOJI_BY_SIPSUNG[p.sipsung] ?? "✦";
          const fortune = fortunes[i];
          const oh = OHAENG_COLOR[fortune.jiOhaeng];
          const grade = GRADE_COLOR[fortune.grade];
          return (
            <button
              key={p.startYear}
              onClick={() => onSelect(p)}
              className={cn(
                "absolute top-0 z-10 w-24 text-center",
                !isPast && !isCurrent && "opacity-50",
              )}
              style={{ left: `${6 + i * 104}px` }}
            >
              <div className="flex h-7 items-end justify-center text-[11px] font-black leading-tight text-red">
                {isCurrent ? (
                  <span>
                    현재
                    <br />▼
                  </span>
                ) : null}
              </div>
              {/* 메인 칸 — 오행 색 배경 + 길흉 dot + 점수 */}
              <div
                className={cn(
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-[4px] text-2xl shadow-[0_8px_18px_rgba(44,62,80,0.1)] relative",
                  oh.bg,
                  isCurrent
                    ? "border-mint"
                    : isSelected
                      ? "border-gold"
                      : oh.border,
                )}
              >
                {emoji}
                {/* 길흉 dot — 우상단 */}
                <span
                  className={cn(
                    "absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                    grade.dot,
                  )}
                  aria-label={`${fortune.grade} ${fortune.score}점`}
                />
              </div>
              <p className="mt-2 min-h-4 text-[10px] font-black text-muted">
                {periodState(p, currentYear)} · {fortune.score}점
              </p>
              <div className="font-hanja mt-1 min-h-6 text-xl font-black leading-none text-navy">
                {p.pillar.ganHanja}
                {p.pillar.jiHanja}
              </div>
              <p className="mt-1 min-h-8 text-[10px] font-bold leading-tight text-muted">
                {p.startAge}~{p.startAge + 9}세
                <br />
                {p.sipsung}
              </p>
              {/* 추가 신호 마커 */}
              <div className="mt-1 flex justify-center gap-0.5">
                {fortune.matchesYongsin && (
                  <span className="rounded-full bg-mint/30 px-1 py-0.5 text-[8px] font-black text-[#16706B]">
                    용신
                  </span>
                )}
                {fortune.hap && (
                  <span className="rounded-full bg-gold/30 px-1 py-0.5 text-[8px] font-black text-[#7C5A0E]">
                    합
                  </span>
                )}
                {fortune.chung && (
                  <span className="rounded-full bg-red/15 px-1 py-0.5 text-[8px] font-black text-red">
                    충
                  </span>
                )}
              </div>
              {isSelected && !isCurrent && (
                <div className="mx-auto mt-2 h-1.5 w-8 rounded-full bg-gold" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
