"use client";

import { useRef, useEffect } from "react";
import type { DaewoonPeriod } from "@/lib/saju/types";
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
  periods,
  currentYear,
  selectedStartYear,
  onSelect,
}: {
  periods: DaewoonPeriod[];
  currentYear: number;
  selectedStartYear: number | null;
  onSelect: (p: DaewoonPeriod) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
        style={{ width: `${periods.length * 104 + 54}px`, height: "214px" }}
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
          return (
            <button
              key={p.startYear}
              onClick={() => onSelect(p)}
              className={cn(
                "absolute top-0 z-10 w-24 text-center",
                !isPast && !isCurrent && "opacity-40 blur-[0.2px]",
              )}
              style={{ left: `${6 + i * 104}px` }}
            >
              <div className="flex h-7 items-end justify-center text-xs font-black leading-tight text-red">
                {isCurrent ? (
                  <span>
                    현재
                    <br />▼
                  </span>
                ) : null}
              </div>
              <div
                className={cn(
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-[4px] bg-white text-2xl shadow-[0_8px_18px_rgba(44,62,80,0.1)]",
                  isCurrent
                    ? "border-mint"
                    : isSelected
                      ? "border-gold"
                      : "border-mint/60",
                )}
              >
                {emoji}
              </div>
              <p className="mt-2 min-h-4 text-[10px] font-black text-muted">
                {periodState(p, currentYear)}
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
