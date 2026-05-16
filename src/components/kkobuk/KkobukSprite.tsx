// Sprite-based renderer for the kkobuk character sheet.
// Uses CSS background-position to clip a single 1536x1024 illustration sheet
// (public/characters/sheet.png) into individual variants. background-size
// scales the whole sheet so each region can be rendered at any target size.

import { cn } from '@/lib/utils/cn';

const SHEET_W = 1536;
const SHEET_H = 1024;

export type SpriteKey =
  // hero pose (left side of sheet)
  | 'hero'
  // 3-view base
  | 'front'
  | 'side'
  | 'back'
  // 4 personas (middle row)
  | 'persona-kkobuk'
  | 'persona-dosa'
  | 'persona-mudang'
  | 'persona-bosal'
  // 6 moods (bottom-left row)
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

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

// First-pass coordinates derived from a visual scan of the 1536x1024 sheet.
// Tuned in browser; re-tune any region by editing the entry below.
export const SPRITE_MAP: Record<SpriteKey, Region> = {
  hero: { x: 30, y: 230, w: 320, h: 400 },

  front: { x: 425, y: 110, w: 165, h: 200 },
  side: { x: 595, y: 110, w: 175, h: 200 },
  back: { x: 770, y: 110, w: 200, h: 200 },

  // Persona character only (each card has a different speech-bubble layout)
  'persona-kkobuk': { x: 425, y: 555, w: 120, h: 135 },
  'persona-dosa': { x: 605, y: 535, w: 200, h: 160 },
  'persona-mudang': { x: 870, y: 555, w: 170, h: 140 },
  'persona-bosal': { x: 1180, y: 540, w: 135, h: 155 },

  'mood-기쁨': { x: 40, y: 820, w: 110, h: 130 },
  'mood-신남': { x: 150, y: 820, w: 110, h: 130 },
  'mood-고민': { x: 260, y: 820, w: 110, h: 130 },
  'mood-놀람': { x: 370, y: 820, w: 110, h: 130 },
  'mood-걱정': { x: 480, y: 820, w: 110, h: 130 },
  'mood-편안': { x: 590, y: 820, w: 110, h: 130 },

  'pose-book': { x: 760, y: 780, w: 150, h: 170 },
  'pose-meditate': { x: 910, y: 780, w: 145, h: 170 },
  'pose-drink': { x: 1060, y: 780, w: 145, h: 170 },
  'pose-bag': { x: 1205, y: 780, w: 145, h: 170 },
  'pose-sing': { x: 1355, y: 780, w: 150, h: 170 },
};

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
const SIZE_HEIGHT: Record<Size, number> = {
  xs: 32,
  sm: 56,
  md: 96,
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
  // Scale so the source region's height fits the requested display height.
  const targetH = SIZE_HEIGHT[size];
  const scale = targetH / region.h;
  const targetW = region.w * scale;

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? variant}
      className={cn('inline-block shrink-0', className)}
      style={{
        width: `${targetW}px`,
        height: `${targetH}px`,
        backgroundImage: 'url(/characters/sheet.png)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `${-region.x * scale}px ${-region.y * scale}px`,
        backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
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
