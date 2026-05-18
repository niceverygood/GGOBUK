import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';

const ICONS: Record<string, string> = {
  overview: '📜',
  ohaeng: '☯',
  ilju: '🪞',
  strength: '✨',
  weakness: '🌿',
  personality: '🧠',
  career: '💼',
  wealth: '💰',
  love: '💕',
  family: '🏡',
  friends: '🤝',
  direction: '🧭',
};

const SUBTITLES: Record<string, string> = {
  overview: '내 등껍질 전체 흐름',
  ohaeng: '강한 기운과 부족한 기운',
  ilju: '본질을 보여주는 한 칸',
  strength: '타고난 세 가지 강점',
  weakness: '경계할 약점과 처방',
  personality: '다정하지만 기준은 뚜렷',
  career: '말과 콘텐츠에 강점',
  wealth: '돈이 모이는 타이밍',
  love: '끌림과 안정감의 패턴',
  family: '책임감이 묶는 관계',
  friends: '나를 키우는 인연',
  direction: '동북 방향의 기운',
};

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {INTERPRETATION_CATEGORIES.map((cat) => (
        <Link
          key={cat.key}
          href={`/shell/${cat.key}`}
          prefetch
          aria-label={`${cat.title} 해설 보기`}
          className="group relative min-h-[110px] p-3.5 rounded-3xl bg-white border border-navy/10 shadow-[0_9px_22px_rgba(44,62,80,0.06)] flex flex-col transition active:scale-[0.99] hover:border-mint/70 hover:shadow-[0_12px_26px_rgba(44,62,80,0.1)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-2xl leading-none">{ICONS[cat.key] ?? '·'}</div>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-mint/15 text-navy opacity-0 transition group-hover:opacity-100">
              <ArrowRight size={14} strokeWidth={3} />
            </span>
          </div>
          <h4 className="mt-2 text-[15px] font-black text-navy">{cat.title}</h4>
          <p className="mt-0.5 text-[11px] font-bold text-muted leading-tight">{SUBTITLES[cat.key]}</p>
          <span className="mt-auto pt-2 text-[10px] font-extrabold text-mint-dark opacity-0 transition group-hover:opacity-100">
            바로 보기
          </span>
        </Link>
      ))}
    </div>
  );
}
