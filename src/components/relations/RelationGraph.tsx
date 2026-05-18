'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { cn } from '@/lib/utils/cn';

export interface GraphNode {
  id: string;
  name: string;
  relationLabel: string | null;
  relationType?: string | null;
  ohaeng: string | null;
  gan?: string | null;
  ji?: string | null;
  ganHanja?: string | null;
  jiHanja?: string | null;
  score: number | null;
}

type EdgeTone = 'hap' | 'chung' | 'neutral';

const OHAENG_STYLE: Record<
  string,
  { bg: string; fg: string; border: string; label: string }
> = {
  목: { bg: '#5DADE2', fg: 'white', border: '#FFFFFF', label: '목' },
  화: { bg: '#E74C3C', fg: 'white', border: '#F8D338', label: '화' },
  토: { bg: '#F4D03F', fg: '#263645', border: '#FFFFFF', label: '토' },
  금: { bg: '#ECF0F1', fg: '#263645', border: '#FFFFFF', label: '금' },
  수: { bg: '#34495E', fg: 'white', border: '#FFFFFF', label: '수' },
};

const SLOTS: Array<{ x: number; y: number }> = [
  { x: 25, y: 24 },
  { x: 76, y: 27 },
  { x: 84, y: 50 },
  { x: 73, y: 76 },
  { x: 28, y: 72 },
  { x: 14, y: 49 },
  { x: 50, y: 17 },
  { x: 50, y: 84 },
];

function edgeTone(score: number | null): EdgeTone {
  if (score == null) return 'neutral';
  if (score >= 70) return 'hap';
  if (score <= 45) return 'chung';
  return 'neutral';
}

function relationToneLabel(score: number | null): string {
  if (score == null) return '대기';
  if (score >= 70) return '합';
  if (score <= 45) return '충';
  return '중립';
}

function relationDisplay(node: GraphNode): string {
  const label = node.relationLabel?.trim();
  if (label) return label;
  if (node.relationType === 'family') return '가족';
  if (node.relationType === 'lover') return '연인';
  if (node.relationType === 'colleague') return '동료';
  return '인연';
}

function pillarDisplay(node: GraphNode): string {
  if (node.ganHanja && node.jiHanja) return `${node.ganHanja}${node.jiHanja}`;
  if (node.gan && node.ji) return `${node.gan}${node.ji}`;
  return node.gan ?? '?';
}

function edgeColor(tone: EdgeTone): string {
  if (tone === 'hap') return '#2FAAA2';
  if (tone === 'chung') return '#E74C3C';
  return '#C7CBC8';
}

export function RelationGraph({
  selfOhaeng,
  nodes,
  onAdd,
}: {
  selfOhaeng: string | null;
  nodes: GraphNode[];
  onAdd?: () => void;
}) {
  const cap = nodes.slice(0, 8);

  return (
    <section className="relative -mx-2 mt-4">
      <div className="relative mx-auto aspect-square w-full max-w-[430px] overflow-visible">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[46, 33, 18].map((r) => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#E8E0D4"
              strokeWidth="0.35"
            />
          ))}
          {cap.map((node, index) => {
            const slot = SLOTS[index % SLOTS.length];
            const tone = edgeTone(node.score);
            return (
              <line
                key={node.id}
                x1="50"
                y1="50"
                x2={slot.x}
                y2={slot.y}
                stroke={edgeColor(tone)}
                strokeWidth={tone === 'neutral' ? '0.75' : '1.1'}
                strokeLinecap="round"
                strokeDasharray={tone === 'chung' ? '2.2 2.2' : undefined}
                opacity={tone === 'neutral' ? 0.55 : 0.95}
              />
            );
          })}
        </svg>

        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-24 w-24 place-items-center rounded-full border-[6px] border-gold bg-[#FFFBE8] shadow-[0_12px_28px_rgba(44,62,80,0.12)]">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-mint/25">
              <KkobukSprite
                variant="front"
                size="xs"
                ariaLabel="나"
                className="scale-125"
              />
            </div>
            <span className="absolute -bottom-7 text-center text-lg font-black text-navy">
              나 · {selfOhaeng ?? '토'}
            </span>
          </div>
        </div>

        {cap.map((node, index) => {
          const slot = SLOTS[index % SLOTS.length];
          const ohaeng = node.ohaeng ?? '토';
          const colors = OHAENG_STYLE[ohaeng] ?? OHAENG_STYLE.토;
          const tone = edgeTone(node.score);
          const strong =
            tone === 'hap' || node.score == null || node.score >= 85;
          return (
            <Link
              key={node.id}
              href={`/relations/${node.id}`}
              aria-label={`${node.name} 궁합 상세 보기`}
              className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center transition active:scale-[0.98]"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <span className="mb-1 max-w-[76px] truncate text-[13px] font-black leading-none text-navy">
                {node.name}
              </span>
              <span
                className={cn(
                  'grid place-items-center rounded-full border-[4px] shadow-[0_14px_28px_rgba(44,62,80,0.12)]',
                  strong ? 'h-[72px] w-[72px]' : 'h-[58px] w-[58px]',
                  tone === 'chung' && 'border-dashed',
                )}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: tone === 'chung' ? '#F2A098' : colors.border,
                  color: colors.fg,
                }}
              >
                <span className="font-hanja text-base font-black leading-none">
                  {pillarDisplay(node)}
                </span>
                <span className="mt-1 text-[10px] font-black leading-none opacity-90">
                  {colors.label} · {relationToneLabel(node.score)}
                </span>
              </span>
              <span className="mt-1 max-w-[82px] truncate text-[10px] font-extrabold text-muted">
                {relationDisplay(node)}
              </span>
            </Link>
          );
        })}

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="인연 추가"
            className="absolute right-[8%] top-[58%] z-40 grid h-[72px] w-[72px] place-items-center rounded-full bg-navy text-white shadow-[0_18px_36px_rgba(44,62,80,0.24)] transition active:scale-95"
          >
            <Plus size={32} strokeWidth={2.4} />
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 px-2 text-xs font-bold text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-1 w-7 rounded-full bg-[#2FAAA2]" />
          합(合)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1 w-7 rounded-full bg-red" />
          충(沖)
        </span>
        <span>·</span>
        <span>부딪힘</span>
      </div>
    </section>
  );
}
