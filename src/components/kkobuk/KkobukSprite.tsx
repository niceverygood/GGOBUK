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

export type KkobukMood =
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'relaxed'
  | 'thinking'
  | 'worried'
  // Legacy daily-fortune mood values kept for cached rows.
  | 'calm'
  | 'focused'
  | 'cautious'
  | '기쁨'
  | '신남'
  | '고민'
  | '놀람'
  | '걱정'
  | '편안';

interface SpriteAsset {
  src: string;
  w: number;
  h: number;
}

const BASE = '/characters/ggobuk';

export const SPRITE_MAP: Record<SpriteKey, SpriteAsset> = {
  hero: { src: `${BASE}/characters/hires/main_waving@2x.png`, w: 2560, h: 2976 },

  front: { src: `${BASE}/characters/hires/turnaround_front@2x.png`, w: 1408, h: 1944 },
  side: { src: `${BASE}/characters/hires/turnaround_side@2x.png`, w: 1264, h: 1936 },
  back: { src: `${BASE}/characters/hires/turnaround_back@2x.png`, w: 1416, h: 1936 },

  'persona-kkobuk': { src: `${BASE}/characters/hires/basic_friend_waving@2x.png`, w: 1440, h: 1728 },
  'persona-dosa': { src: `${BASE}/characters/hires/saju_master_staff@2x.png`, w: 1688, h: 2008 },
  'persona-mudang': { src: `${BASE}/characters/hires/direct_shaman_bell@2x.png`, w: 1728, h: 1856 },
  'persona-bosal': { src: `${BASE}/characters/hires/comfort_bodhisattva_beads@2x.png`, w: 1464, h: 1856 },

  'mood-기쁨': { src: `${BASE}/expressions/hires/expr_happy@3x.png`, w: 1176, h: 1116 },
  'mood-신남': { src: `${BASE}/expressions/hires/expr_excited@3x.png`, w: 1212, h: 1116 },
  'mood-고민': { src: `${BASE}/expressions/hires/expr_thinking@3x.png`, w: 1212, h: 1116 },
  'mood-놀람': { src: `${BASE}/expressions/hires/expr_surprised@3x.png`, w: 1176, h: 1116 },
  'mood-걱정': { src: `${BASE}/expressions/hires/expr_worried@3x.png`, w: 1200, h: 1116 },
  'mood-편안': { src: `${BASE}/expressions/hires/expr_relaxed@3x.png`, w: 1212, h: 1116 },

  'pose-book': { src: `${BASE}/poses/hires/pose_reading_book@3x.png`, w: 1248, h: 1272 },
  'pose-meditate': { src: `${BASE}/poses/hires/pose_fortune_board@3x.png`, w: 1536, h: 1368 },
  'pose-drink': { src: `${BASE}/poses/hires/pose_holding_tea@3x.png`, w: 1392, h: 1368 },
  'pose-bag': { src: `${BASE}/poses/hires/pose_walking_bag@3x.png`, w: 1212, h: 1368 },
  'pose-sing': { src: `${BASE}/poses/hires/pose_singing@3x.png`, w: 1608, h: 1380 },
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
      sizes={`${targetW}px`}
      unoptimized
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
  excited: 'mood-신남',
  surprised: 'mood-놀람',
  relaxed: 'mood-편안',
  thinking: 'mood-고민',
  worried: 'mood-걱정',
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
