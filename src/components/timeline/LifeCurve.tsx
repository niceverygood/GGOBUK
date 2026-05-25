'use client';

import { useMemo } from 'react';
import { daewoonFortune } from '@/lib/saju/daewoon_fortune';
import type { DaewoonPeriod, SajuResult } from '@/lib/saju/types';

/**
 * 인생 운세 곡선 — 8개 대운의 점수를 SVG line chart로 그린다.
 *
 * Recharts 같은 라이브러리 안 쓰고 SVG로 직접 그려 번들 가벼움.
 * 각 점에 호버/탭하면 그 대운 정보가 위에 뜸.
 */
export function LifeCurve({
  saju,
  daewoon,
  currentYear,
  selectedStartYear,
  onSelect,
}: {
  saju: SajuResult;
  daewoon: DaewoonPeriod[];
  currentYear: number;
  selectedStartYear: number | null;
  onSelect: (period: DaewoonPeriod) => void;
}) {
  const fortunes = useMemo(
    () => daewoon.map((d) => ({ period: d, fortune: daewoonFortune(saju, d) })),
    [saju, daewoon],
  );

  if (fortunes.length === 0) return null;

  const width = 320;
  const height = 140;
  const padX = 20;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = fortunes.length > 1 ? innerW / (fortunes.length - 1) : 0;

  const pointAt = (i: number, score: number) => ({
    x: padX + i * step,
    y: padY + innerH - ((score - 20) / 75) * innerH,
  });

  const points = fortunes.map((f, i) => pointAt(i, f.fortune.score));
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  // smooth area path
  const areaPath =
    points.length > 0
      ? `M ${points[0].x} ${padY + innerH} ` +
        points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x} ${padY + innerH} Z`
      : '';

  const currentIdx = fortunes.findIndex(
    (f) =>
      currentYear >= f.period.startYear && currentYear <= f.period.startYear + 9,
  );

  return (
    <div className="rounded-3xl border border-navy/8 bg-white/80 p-4 shadow-[0_8px_18px_rgba(44,62,80,0.05)]">
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-[10px] font-extrabold text-mint-dark">
            인생 운세 곡선
          </p>
          <h3 className="text-sm font-black text-navy">대운별 길흉 점수</h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-black text-muted">
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full bg-mint inline-block" />길
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full bg-gold inline-block" />평
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full bg-red inline-block" />주의
          </span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 no-scrollbar">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[320px]"
          aria-label="인생 운세 곡선"
        >
          {/* 가이드 라인 (50점·70점) */}
          <line
            x1={padX}
            x2={width - padX}
            y1={padY + innerH - ((50 - 20) / 75) * innerH}
            y2={padY + innerH - ((50 - 20) / 75) * innerH}
            stroke="rgba(44,62,80,0.08)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <line
            x1={padX}
            x2={width - padX}
            y1={padY + innerH - ((72 - 20) / 75) * innerH}
            y2={padY + innerH - ((72 - 20) / 75) * innerH}
            stroke="rgba(78,205,196,0.25)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* 현재 대운 강조 세로선 */}
          {currentIdx >= 0 && (
            <line
              x1={padX + currentIdx * step}
              x2={padX + currentIdx * step}
              y1={padY - 4}
              y2={padY + innerH + 4}
              stroke="rgba(44,62,80,0.18)"
              strokeWidth={1}
            />
          )}

          {/* 영역 fill */}
          <path
            d={areaPath}
            fill="url(#curveGrad)"
            opacity={0.55}
          />
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ECDC4" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#4ECDC4" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* 라인 */}
          <path
            d={linePath}
            fill="none"
            stroke="#2C3E50"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* 각 대운 점 */}
          {fortunes.map((f, i) => {
            const p = points[i];
            const isCurrent = i === currentIdx;
            const isSelected = f.period.startYear === selectedStartYear;
            const fill =
              f.fortune.grade === '길'
                ? '#4ECDC4'
                : f.fortune.grade === '평'
                  ? '#F4D03F'
                  : '#E74C3C';
            return (
              <g
                key={f.period.startYear}
                onClick={() => onSelect(f.period)}
                style={{ cursor: 'pointer' }}
              >
                {(isCurrent || isSelected) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={9}
                    fill={fill}
                    opacity={0.22}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isCurrent ? 6 : isSelected ? 5.5 : 4.5}
                  fill={fill}
                  stroke={isCurrent || isSelected ? '#2C3E50' : '#ffffff'}
                  strokeWidth={isCurrent || isSelected ? 2 : 1.5}
                />
                {/* 점수 라벨 (위) */}
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={900}
                  fill="#2C3E50"
                >
                  {f.fortune.score}
                </text>
                {/* 나이 라벨 (아래) */}
                <text
                  x={p.x}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="#8A8072"
                >
                  {f.period.startAge}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
