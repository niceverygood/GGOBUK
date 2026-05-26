// Global registry of in-flight LLM generation jobs + recent completions.
//
// Two purposes:
//
//  1) **Mode-switch guard** — the persona-mode chip subscribes and disables
//     itself while any generation is running. Swapping mode mid-generation
//     would orphan the in-flight request and produce mode-mismatched output.
//
//  2) **Notification center** — the bell chip shows current active items
//     ("사주 해설 — 가족 관계 생성 중...") and recently completed items with
//     a red unread dot until the user opens the panel.
//
// The registry is process-global (module-level Map) so it survives navigation
// between (main) routes. Items are keyed by string id so the same component
// can register/settle idempotently.

export interface GenerationItem {
  id: string;
  /** 사람 읽기 좋은 작업 이름 (예: "사주 해설 — 가족 관계") */
  label: string;
  /** 결과 페이지 경로 — 완료 후 알림 카드에서 클릭하면 이동 */
  href?: string;
  status: 'running' | 'success' | 'error';
  startedAt: number;
  settledAt?: number;
}

const items = new Map<string, GenerationItem>();
/** 사용자가 이미 알림 패널에서 본 완료 id 집합 — 빨간 dot 표시 제어용. */
const acknowledgedIds = new Set<string>();
const listeners = new Set<() => void>();

const MAX_HISTORY = 20;

function notify() {
  for (const fn of listeners) fn();
}

/** 풍부한 정보로 작업을 등록. label 없는 곳에서는 lockGeneration을 쓰면 됨. */
export function startGeneration(
  id: string,
  label: string,
  href?: string,
): void {
  // 같은 id가 이미 running이면 그대로 (re-entrant)
  if (items.get(id)?.status === 'running') return;
  items.set(id, {
    id,
    label,
    href,
    status: 'running',
    startedAt: Date.now(),
  });
  trimHistory();
  notify();
}

export function completeGeneration(
  id: string,
  status: 'success' | 'error' = 'success',
): void {
  const item = items.get(id);
  if (!item) return;
  item.status = status;
  item.settledAt = Date.now();
  notify();
}

/** 알림 패널이 열리면 호출 — 모든 완료를 '봤음'으로 표시해 빨간 dot 끔. */
export function acknowledgeAll(): void {
  let changed = false;
  for (const [id, item] of items) {
    if (item.status !== 'running' && !acknowledgedIds.has(id)) {
      acknowledgedIds.add(id);
      changed = true;
    }
  }
  if (changed) notify();
}

function trimHistory() {
  if (items.size <= MAX_HISTORY) return;
  // 오래된 settled 항목부터 삭제. running은 보존.
  const sorted = [...items.values()]
    .filter((i) => i.status !== 'running')
    .sort((a, b) => (a.settledAt ?? 0) - (b.settledAt ?? 0));
  while (items.size > MAX_HISTORY && sorted.length > 0) {
    const oldest = sorted.shift();
    if (oldest) {
      items.delete(oldest.id);
      acknowledgedIds.delete(oldest.id);
    }
  }
}

// ── Selectors ──────────────────────────────────────────────────────────────

export function isAnyGenerationLocked(): boolean {
  for (const item of items.values()) {
    if (item.status === 'running') return true;
  }
  return false;
}

export function getActiveItems(): GenerationItem[] {
  return [...items.values()]
    .filter((i) => i.status === 'running')
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getCompletedItems(): GenerationItem[] {
  return [...items.values()]
    .filter((i) => i.status !== 'running')
    .sort((a, b) => (b.settledAt ?? 0) - (a.settledAt ?? 0));
}

export function getUnreadCount(): number {
  let n = 0;
  for (const [id, item] of items) {
    if (item.status !== 'running' && !acknowledgedIds.has(id)) n += 1;
  }
  return n;
}

export function isAcknowledged(id: string): boolean {
  return acknowledgedIds.has(id);
}

export function subscribeGenerationLock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Legacy compat API (label 없이 잠금만) ──────────────────────────────────

/**
 * Label/href 없이 단순 lock — 기존 모드 가드 호환용.
 * 새로 호출하는 곳에서는 startGeneration(id, label, href)를 쓰는 게 좋음.
 */
export function lockGeneration(id: string): void {
  startGeneration(id, defaultLabelFor(id));
}

export function unlockGeneration(id: string): void {
  completeGeneration(id, 'success');
}

/** id 패턴으로 사람이 읽기 좋은 기본 라벨 추정. */
function defaultLabelFor(id: string): string {
  if (id.startsWith('interp:')) {
    const category = id.slice('interp:'.length);
    return `사주 해설 — ${category}`;
  }
  if (id.startsWith('coldread:')) {
    const startYear = id.slice('coldread:'.length);
    return `대운 AI 해설 — ${startYear}~`;
  }
  if (id.startsWith('compat:')) return '궁합 리포트';
  if (id.startsWith('daily:')) return '오늘의 운세';
  if (id.startsWith('usecase:')) {
    const k = id.slice('usecase:'.length);
    return `포커스 풀이 — ${k}`;
  }
  return id;
}
