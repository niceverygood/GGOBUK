import { cn } from '@/lib/utils/cn';

export type KkobukVariant = 'kkobuk' | 'dosa' | 'mudang' | 'bosal';
type Size = 'sm' | 'md' | 'lg' | 'xl';
const SIZES: Record<Size, number> = { sm: 48, md: 80, lg: 120, xl: 200 };

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
  const px = SIZES[size];
  // Mood subtly tweaks the mouth path.
  const mouth =
    mood === 'happy'
      ? 'M 90 68 Q 100 76 110 68'
      : mood === 'cautious'
        ? 'M 90 71 Q 100 67 110 71'
        : 'M 92 68 Q 100 73 108 68';

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 200 200"
      className={cn('inline-block', className)}
      role="img"
      aria-label={`꼬북이 ${variant}`}
    >
      {/* shell back */}
      <ellipse cx="100" cy="115" rx="72" ry="58" fill="#4ECDC4" stroke="#2C3E50" strokeWidth="3" />
      {/* shell hexagons */}
      <g fill="#3DB5AC" stroke="#2C3E50" strokeWidth="1.5">
        <polygon points="100,80 122,93 122,116 100,128 78,116 78,93" />
        <polygon points="58,100 73,108 73,123 58,131 47,123 47,108" />
        <polygon points="142,100 153,108 153,123 142,131 127,123 127,108" />
      </g>
      {/* head */}
      <ellipse cx="100" cy="62" rx="26" ry="23" fill="#88D8B0" stroke="#2C3E50" strokeWidth="3" />
      {/* eyes */}
      <circle cx="91" cy="59" r="3.5" fill="#2C3E50" />
      <circle cx="109" cy="59" r="3.5" fill="#2C3E50" />
      {/* mouth (mood) */}
      <path d={mouth} stroke="#2C3E50" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* legs */}
      <ellipse cx="52" cy="160" rx="15" ry="11" fill="#88D8B0" stroke="#2C3E50" strokeWidth="2.5" />
      <ellipse cx="148" cy="160" rx="15" ry="11" fill="#88D8B0" stroke="#2C3E50" strokeWidth="2.5" />
      <ellipse cx="68" cy="175" rx="11" ry="8" fill="#88D8B0" stroke="#2C3E50" strokeWidth="2.5" />
      <ellipse cx="132" cy="175" rx="11" ry="8" fill="#88D8B0" stroke="#2C3E50" strokeWidth="2.5" />

      {/* persona accessories */}
      {variant === 'dosa' && (
        <g>
          {/* white beard */}
          <path
            d="M 85 70 Q 100 100 115 70 Q 110 88 100 92 Q 90 88 85 70 Z"
            fill="#FFFFFF"
            stroke="#2C3E50"
            strokeWidth="2"
          />
          {/* scholar's hat */}
          <rect x="76" y="28" width="48" height="14" fill="#2C3E50" />
          <rect x="68" y="38" width="64" height="5" fill="#2C3E50" />
          {/* tassel */}
          <circle cx="124" cy="32" r="3" fill="#E74C3C" />
        </g>
      )}
      {variant === 'mudang' && (
        <g>
          {/* shaman bells on top */}
          <line x1="100" y1="20" x2="100" y2="40" stroke="#2C3E50" strokeWidth="2" />
          <circle cx="90" cy="25" r="6" fill="#F4D03F" stroke="#2C3E50" strokeWidth="2" />
          <circle cx="110" cy="25" r="6" fill="#F4D03F" stroke="#2C3E50" strokeWidth="2" />
          <circle cx="100" cy="18" r="5" fill="#E74C3C" stroke="#2C3E50" strokeWidth="2" />
          {/* small bell strikers */}
          <circle cx="90" cy="27" r="1.5" fill="#2C3E50" />
          <circle cx="110" cy="27" r="1.5" fill="#2C3E50" />
        </g>
      )}
      {variant === 'bosal' && (
        <g fill="#8B4513" stroke="#2C3E50" strokeWidth="1.5">
          <circle cx="73" cy="84" r="4" />
          <circle cx="84" cy="88" r="4" />
          <circle cx="100" cy="90" r="4" />
          <circle cx="116" cy="88" r="4" />
          <circle cx="127" cy="84" r="4" />
        </g>
      )}
    </svg>
  );
}
