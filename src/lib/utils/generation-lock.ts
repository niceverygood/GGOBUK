// Global registry of in-flight LLM generation jobs.
//
// Any AI-driven component (interpretation panel, cold-read card, compat
// builder, daily fortune fetcher) can call `lockGeneration(id)` when it starts
// a request and `unlockGeneration(id)` when it settles. The persona-mode chip
// subscribes via `subscribeGenerationLock` and disables itself while any lock
// is held — switching modes mid-generation would orphan the in-flight request
// and produce mode-mismatched output.
//
// The registry is process-global (module-level Set) so it survives navigation
// between (main) routes. Locks are tied to a string id so the same component
// can lock/unlock idempotently.

const locks = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function lockGeneration(id: string): void {
  if (locks.has(id)) return;
  locks.add(id);
  notify();
}

export function unlockGeneration(id: string): void {
  if (!locks.delete(id)) return;
  notify();
}

export function isAnyGenerationLocked(): boolean {
  return locks.size > 0;
}

export function subscribeGenerationLock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
