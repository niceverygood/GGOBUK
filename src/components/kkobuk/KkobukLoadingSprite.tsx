import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';

interface KkobukLoadingSpriteProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export function KkobukLoadingSprite({
  size = 58,
  className,
  ariaLabel = '꼬북이가 사주판을 펴는 중',
}: KkobukLoadingSpriteProps) {
  const style = {
    '--kkobuk-loader-size': `${size}px`,
    '--kkobuk-loader-sheet-width': `${size * 8}px`,
    '--kkobuk-loader-offset': `${size * -8}px`,
  } as CSSProperties;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn('kkobuk-loading-sprite', className)}
      style={style}
    />
  );
}
