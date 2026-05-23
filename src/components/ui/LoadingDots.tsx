'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Maximum number of dots in the cycle (default 3) */
  count?: number;
  /** ms between dot transitions (default 380) */
  intervalMs?: number;
  className?: string;
}

/**
 * Animated trailing dots — cycles "" → "." → ".." → "..." → "" ...
 *
 * Use inline after a "OOO하는 중" / "OOO 가져오는 중" string to communicate
 * that something is in flight when you don't have a full progress signal.
 * Reserves the maximum width so layout doesn't jiggle as dots are added.
 */
export function LoadingDots({
  count = 3,
  intervalMs = 380,
  className,
}: Props) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => (v + 1) % (count + 1));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs]);

  return (
    <span
      aria-hidden
      className={`relative inline-block align-baseline tabular-nums ${className ?? ''}`}
    >
      {/* Visible animated dots */}
      <span>{'.'.repeat(n)}</span>
      {/* Invisible spacer reserves full width so neighbors don't shift */}
      <span aria-hidden className="invisible">
        {'.'.repeat(count - n)}
      </span>
    </span>
  );
}
