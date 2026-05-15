// Client-safe entrypoint for the saju engine. Re-exports buildSajuResult and the
// preview state encoding helpers so /preview pages stay free of DB/auth code.

import { buildSajuResult } from './index';
import type { SajuInput, SajuResult } from './types';

export function computePreview(input: SajuInput): SajuResult {
  return buildSajuResult(input);
}

const STORAGE_KEY = 'kkobuk_preview_input';

export function savePreviewInput(input: SajuInput, name: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ input, name }));
  } catch {
    // ignore
  }
}

export function loadPreviewInput(): { input: SajuInput; name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { input: SajuInput; name: string };
  } catch {
    return null;
  }
}

export function clearPreviewInput() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
