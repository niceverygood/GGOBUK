// User's currently selected interpretation persona — stored in localStorage so
// the choice persists across navigation. Server components read it via cookie
// (set by the client on change) or fall back to URL search param.

import type { PersonaKey } from '@/lib/llm/personas';

const STORAGE_KEY = 'ggobuk_persona_mode';
const COOKIE_KEY = 'ggobuk_persona_mode';
const VALID: PersonaKey[] = ['kkobuk', 'dosa', 'mudang', 'bosal'];

export function isPersonaKey(value: string): value is PersonaKey {
  return (VALID as string[]).includes(value);
}

export function readPersonaMode(): PersonaKey {
  if (typeof window === 'undefined') return 'dosa';
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? '';
  return isPersonaKey(raw) ? raw : 'dosa';
}

export function writePersonaMode(persona: PersonaKey): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, persona);
  // Mirror to a cookie so server components can read it.
  document.cookie = `${COOKIE_KEY}=${persona};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function readPersonaModeFromCookieHeader(
  cookieHeader: string | null | undefined,
): PersonaKey {
  if (!cookieHeader) return 'dosa';
  const match = cookieHeader.match(new RegExp(`${COOKIE_KEY}=([^;]+)`));
  if (!match) return 'dosa';
  const v = decodeURIComponent(match[1].trim());
  return isPersonaKey(v) ? v : 'dosa';
}
