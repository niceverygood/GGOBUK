import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

export type SpriteKey =
  | 'hero'
  | 'front'
  | 'side'
  | 'back'
  | 'persona-kkobuk'
  | 'persona-dosa'
  | 'persona-mudang'
  | 'persona-bosal'
  | 'mood-기쁨'
  | 'mood-신남'
  | 'mood-고민'
  | 'mood-놀람'
  | 'mood-걱정'
  | 'mood-편안'
  // 5 poses (bottom-right row)
  | 'pose-book'
  | 'pose-meditate'
  | 'pose-drink'
  | 'pose-bag'
  | 'pose-sing';

interface SpriteAsset {
  src: string;
  w: number;
  h: number;
}

const BASE = '/characters/ggobuk';

export const SPRITE_MAP: Record<SpriteKey, SpriteAsset> = {
  hero: { src: `${BASE}/characters/main_waving.png`, w: 320, h: 372 },

  front: { src: `${BASE}/characters/turnaround_front.png`, w: 176, h: 243 },
  side: { src: `${BASE}/characters/turnaround_side.png`, w: 158, h: 242 },
  back: { src: `${BASE}/characters/turnaround_back.png`, w: 177, h: 242 },

  'persona-kkobuk': { src: `${BASE}/characters/basic_friend_waving.png`, w: 180, h: 216 },
  'persona-dosa': { src: `${BASE}/characters/saju_master_staff.png`, w: 211, h: 251 },
  'persona-mudang': { src: `${BASE}/characters/direct_shaman_bell.png`, w: 216, h: 232 },
  'persona-bosal': { src: `${BASE}/characters/comfort_bodhisattva_beads.png`, w: 183, h: 232 },

  'mood-기쁨': { src: `${BASE}/expressions/expr_happy.png`, w: 98, h: 93 },
  'mood-신남': { src: `${BASE}/expressions/expr_excited.png`, w: 101, h: 93 },
  'mood-고민': { src: `${BASE}/expressions/expr_thinking.png`, w: 101, h: 93 },
  'mood-놀람': { src: `${BASE}/expressions/expr_surprised.png`, w: 98, h: 93 },
  'mood-걱정': { src: `${BASE}/expressions/expr_worried.png`, w: 100, h: 93 },
  'mood-편안': { src: `${BASE}/expressions/expr_relaxed.png`, w: 101, h: 93 },

  'pose-book': { src: `${BASE}/poses/pose_reading_book.png`, w: 104, h: 106 },
  'pose-meditate': { src: `${BASE}/poses/pose_fortune_board.png`, w: 128, h: 114 },
  'pose-drink': { src: `${BASE}/poses/pose_holding_tea.png`, w: 116, h: 114 },
  'pose-bag': { src: `${BASE}/poses/pose_walking_bag.png`, w: 101, h: 114 },
  'pose-sing': { src: `${BASE}/poses/pose_singing.png`, w: 134, h: 115 },
};

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
const SIZE_HEIGHT: Record<Size, number> = {
  xs: 32,
  sm: 48,
  md: 88,
  lg: 144,
  xl: 200,
  hero: 280,
};

export function KkobukSprite({
  variant,
  size = 'md',
  className,
  ariaLabel,
}: {
  variant: SpriteKey;
  size?: Size;
  className?: string;
  ariaLabel?: string;
}) {
  const region = SPRITE_MAP[variant];
  const targetH = SIZE_HEIGHT[size];
  const targetW = Math.round((region.w / region.h) * targetH);

  return (
    <Image
      src={region.src}
      alt={ariaLabel ?? variant}
      width={region.w}
      height={region.h}
      draggable={false}
      className={cn('inline-block shrink-0 object-contain select-none', className)}
      style={{
        width: `${targetW}px`,
        height: `${targetH}px`,
      }}
    />
  );
}

// Convenience: map a 'mood' string to a sprite key.
const MOOD_MAP: Record<string, SpriteKey> = {
  happy: 'mood-기쁨',
  calm: 'mood-편안',
  focused: 'mood-고민',
  cautious: 'mood-걱정',
  기쁨: 'mood-기쁨',
  신남: 'mood-신남',
  고민: 'mood-고민',
  놀람: 'mood-놀람',
  걱정: 'mood-걱정',
  편안: 'mood-편안',
};

export function moodToSprite(mood: string | null | undefined, fallback: SpriteKey = 'mood-편안'): SpriteKey {
  if (!mood) return fallback;
  return MOOD_MAP[mood] ?? fallback;
}
