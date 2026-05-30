'use client';

// Reactive persona-mode reader for client components. Split out from
// `persona-mode.ts` so that module stays React-free and importable by Server
// Components / route handlers (Next.js RSC boundary).

import { useEffect, useState } from 'react';
import type { PersonaKey } from '@/lib/llm/personas';
import { STORAGE_KEY, readPersonaMode } from './persona-mode';

/**
 * Returns the current persona and re-renders whenever it changes — either a
 * `storage` event from another tab/component, or the in-tab
 * `ggobuk:persona-mode` custom event dispatched by `writePersonaMode` /
 * `notifyPersonaChange`.
 */
export function usePersonaMode(): PersonaKey {
  const [persona, setPersona] = useState<PersonaKey>('dosa');
  useEffect(() => {
    setPersona(readPersonaMode());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPersona(readPersonaMode());
    };
    const onLocal = () => setPersona(readPersonaMode());
    window.addEventListener('storage', onStorage);
    window.addEventListener('ggobuk:persona-mode', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('ggobuk:persona-mode', onLocal);
    };
  }, []);
  return persona;
}
