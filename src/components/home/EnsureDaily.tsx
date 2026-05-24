'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  lockGeneration,
  unlockGeneration,
} from '@/lib/utils/generation-lock';

/**
 * Mounted on /home when there is no `daily_fortunes` row for today.
 *
 * Fires `GET /api/daily?saju_id=...` which, on the server, calls the LLM
 * (`generateDaily`) and inserts a real saju-tailored daily fortune. After
 * the row is committed we call `router.refresh()` so the server component
 * re-fetches and the placeholder ("…가져오는 중이야") is replaced with
 * the real one-liner.
 *
 * One-shot per mount — guarded by a ref so React strict-mode double-effect
 * doesn't double-bill the LLM.
 */
export function EnsureDaily({ sajuId }: { sajuId: string }) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    let cancelled = false;
    const lockId = `daily:${sajuId}`;
    lockGeneration(lockId);
    (async () => {
      try {
        const res = await fetch(
          `/api/daily?saju_id=${encodeURIComponent(sajuId)}`,
          { cache: 'no-store' },
        );
        if (cancelled) return;
        // Refresh either on success or on a recoverable failure so the
        // server component can re-render with the fallback or any partial
        // state. 401/403 means the user signed out — let middleware redirect.
        if (res.ok || res.status === 503 || res.status === 500) {
          router.refresh();
        }
      } catch {
        // Network error — silently swallow. The user can pull-to-refresh.
      } finally {
        unlockGeneration(lockId);
      }
    })();

    return () => {
      cancelled = true;
      unlockGeneration(lockId);
    };
  }, [sajuId, router]);

  return null;
}
