import { cn } from '@/lib/utils/cn';
import { KkobukSprite, moodToSprite, type SpriteKey } from './KkobukSprite';

export type KkobukVariant = 'kkobuk' | 'dosa' | 'mudang' | 'bosal';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_SIZE: Record<Size, string> = {
  sm: 'h-10 w-10',
  md: 'h-20 w-20',
  lg: 'h-[120px] w-[120px]',
  xl: 'h-[200px] w-[200px]',
};

const SPRITE_SIZE: Record<Size, 'xs' | 'sm' | 'md' | 'xl'> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'xl',
};

const PERSONA_SPRITE: Record<KkobukVariant, SpriteKey> = {
  kkobuk: 'persona-kkobuk',
  dosa: 'persona-dosa',
  mudang: 'persona-mudang',
  bosal: 'persona-bosal',
};

export function KkobukAvatar({
  variant = 'kkobuk',
  size = 'md',
  className,
  mood,
}: {
  variant?: KkobukVariant;
  size?: Size;
  className?: string;
  mood?: 'happy' | 'calm' | 'focused' | 'cautious';
}) {
  const sprite = mood ? moodToSprite(mood, PERSONA_SPRITE[variant]) : PERSONA_SPRITE[variant];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-visible',
        AVATAR_SIZE[size],
        className,
      )}
    >
      <KkobukSprite
        variant={sprite}
        size={SPRITE_SIZE[size]}
        ariaLabel={`꼬북이 ${variant}`}
      />
    </span>
  );
}
