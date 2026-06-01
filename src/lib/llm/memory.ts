import { complete, isLLMConfigured } from './client';
import { createServerClient } from '@/lib/supabase/server';
import type { MemoryItem, MemoryKind } from '@/types/db';

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

/** 한 유저가 보관하는 기억 최대 개수. 넘치면 salience 낮고 오래된 것부터 폐기. */
export const MEMORY_MAX_ITEMS = 30;
/** 프롬프트에 주입할 때 노출하는 상위 항목 수(토큰 절약). */
const MEMORY_INJECT_LIMIT = 24;
/** 추출 시 살펴보는 최근 메시지 수. */
const EXTRACTION_HISTORY_LIMIT = 24;
/** 추출 시 메시지 1개당 자르는 길이. */
const MESSAGE_SNIPPET_MAX = 600;

const VALID_KINDS: ReadonlySet<MemoryKind> = new Set<MemoryKind>([
  'fact',
  'situation',
  'preference',
  'relationship',
  'goal',
  'emotion',
]);

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function norm(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function bySalienceThenRecency(a: MemoryItem, b: MemoryItem): number {
  return b.salience - a.salience || b.lastSeenAt.localeCompare(a.lastSeenAt);
}

/**
 * 시스템 프롬프트에 주입할 기억 블록(평문 줄목록). 비어 있으면 '' 반환 →
 * 호출부가 블록 자체를 생략하므로 기존 동작이 그대로 유지된다.
 */
export function formatUserMemory(items: MemoryItem[]): string {
  if (!items.length) return '';
  return [...items]
    .sort(bySalienceThenRecency)
    .slice(0, MEMORY_INJECT_LIMIT)
    .map((i) => `- ${i.text}`)
    .join('\n');
}

const EXTRACTOR_SYSTEM = `너는 대화에서 사용자에 대해 "앞으로도 유효할 사실"만 추려 기억 목록을 갱신하는 보조 시스템이다. 출력은 오직 JSON 객체.

목표: 다음에 다시 만났을 때 이 사람을 기억하기 위한 장기 메모. 페르소나 말투·운세 해석이 아니라, 사용자에 관한 담백한 사실만 모은다.

규칙:
- 기존 목록 중 여전히 유효한 항목은 유지하고, 새로 드러난 사실을 추가한다. 모순되거나 철 지난 항목은 빼고, 사용자가 정정한 내용이 있으면 그쪽을 따른다.
- 결과는 "최종 보관할 전체 목록"이다(기존+신규 머지된 상태). 최대 ${MEMORY_MAX_ITEMS}개.
- 각 항목 text 는 한국어 한 줄, 간결하게(40자 이내 권장). 예: "이직 준비 중 — IT 회사 면접 앞둠", "강아지 콩이 키움", "직설적인 조언 선호".
- kind 는 다음 중 하나: fact, situation, preference, relationship, goal, emotion.
- salience 는 1~5 정수. 5=핵심 정체성/장기 목표, 1=약하게 스친 정보.
- 절대 저장 금지: 건강·질병·장애·종교·성적지향·정치성향 등 민감정보, 비밀번호·주민번호·카드번호·정확한 주소/전화번호, 한 번 스친 잡담, 그리고 사주 팔자/오행 같은 계산 결과(이미 따로 보관됨).
- 확실하지 않으면 넣지 마라. 새로 추가할 게 없으면 기존 목록을 그대로 반환한다.

출력 형식(이 스키마만, 코드펜스·설명 금지):
{"items":[{"text":"...","kind":"fact","salience":3}]}`;

interface RawItem {
  text?: unknown;
  kind?: unknown;
  salience?: unknown;
}

function parseItems(text: string): RawItem[] | null {
  if (!text) return null;
  // 코드펜스/잡텍스트 방어: 첫 '{' 부터 마지막 '}' 까지만 취한다.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      items?: unknown;
    };
    if (!Array.isArray(parsed.items)) return null;
    return parsed.items as RawItem[];
  } catch {
    return null;
  }
}

/**
 * 모델이 돌려준 목록을 기존 항목과 reconcile.
 * - 같은 텍스트(정규화 비교)는 기존 id·createdAt 유지하고 lastSeenAt 갱신.
 * - 새 텍스트는 새 id + now.
 * - 텍스트 중복 제거, kind/salience 검증, 캡 적용.
 */
function reconcile(raw: RawItem[], current: MemoryItem[]): MemoryItem[] {
  const now = new Date().toISOString();
  const byText = new Map(current.map((i) => [norm(i.text), i]));
  const seen = new Set<string>();
  const out: MemoryItem[] = [];

  for (const r of raw) {
    const text = typeof r.text === 'string' ? r.text.trim() : '';
    if (!text) continue;
    const key = norm(text);
    if (seen.has(key)) continue;
    seen.add(key);

    const kind: MemoryKind = VALID_KINDS.has(r.kind as MemoryKind)
      ? (r.kind as MemoryKind)
      : 'fact';
    const salience = clamp(Math.round(Number(r.salience) || 3), 1, 5);
    const existing = byText.get(key);

    out.push(
      existing
        ? { ...existing, text, kind, salience, lastSeenAt: now }
        : {
            id: crypto.randomUUID(),
            text,
            kind,
            salience,
            createdAt: now,
            lastSeenAt: now,
          },
    );
  }

  return out.sort(bySalienceThenRecency).slice(0, MEMORY_MAX_ITEMS);
}

/**
 * 최근 대화 + 현재 기억 → 갱신된 기억 목록. 모델 미설정/오류/파싱실패면
 * 현재 목록을 그대로 돌려준다(no-op degrade).
 */
export async function extractMemory(params: {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentItems: MemoryItem[];
}): Promise<MemoryItem[]> {
  if (!isLLMConfigured() || params.history.length === 0) {
    return params.currentItems;
  }

  const transcript = params.history
    .map(
      (m) =>
        `${m.role === 'user' ? '사용자' : '꼬북이'}: ${m.content
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, MESSAGE_SNIPPET_MAX)}`,
    )
    .join('\n');

  const currentList = params.currentItems.length
    ? params.currentItems
        .map((i) => `- (${i.kind}, ${i.salience}) ${i.text}`)
        .join('\n')
    : '(없음)';

  let text: string;
  try {
    const res = await complete({
      tier: 'cheap',
      system: EXTRACTOR_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `## 지금까지 기억 목록\n${currentList}\n\n## 최근 대화\n${transcript}\n\nJSON만 출력.`,
        },
      ],
      maxTokens: 700,
      temperature: 0.2,
      responseFormat: 'json_object',
    });
    text = res.text;
  } catch {
    return params.currentItems;
  }

  const raw = parseItems(text);
  if (!raw) return params.currentItems;
  return reconcile(raw, params.currentItems);
}

export async function loadUserMemory(
  supabase: ServerClient,
  userId: string,
): Promise<MemoryItem[]> {
  const { data } = await supabase
    .from('user_memory')
    .select('items')
    .eq('user_id', userId)
    .maybeSingle<{ items: MemoryItem[] }>();
  return Array.isArray(data?.items) ? data.items : [];
}

export async function saveUserMemory(
  admin: ServerClient,
  userId: string,
  items: MemoryItem[],
): Promise<void> {
  await admin.from('user_memory').upsert(
    {
      user_id: userId,
      items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

function sameMemory(a: MemoryItem[], b: MemoryItem[]): boolean {
  if (a.length !== b.length) return false;
  const key = (items: MemoryItem[]) =>
    items
      .map((i) => `${norm(i.text)}|${i.kind}|${i.salience}`)
      .sort()
      .join('§');
  return key(a) === key(b);
}

/**
 * 채팅 응답이 끝난 뒤 백그라운드(next/server after())에서 호출.
 * 세션 소유권을 확인하고, 최근 메시지에서 기억을 추출해 저장한다.
 * 절대 throw 하지 않는다(요청 수명에 영향 X) — best-effort.
 */
export async function updateUserMemoryFromSession(opts: {
  userId: string;
  sessionId: string;
}): Promise<void> {
  try {
    if (!isLLMConfigured()) return;
    const admin = await createServerClient({ admin: true });

    const { data: session } = await admin
      .from('chat_sessions')
      .select('user_id')
      .eq('id', opts.sessionId)
      .maybeSingle<{ user_id: string }>();
    if (!session || session.user_id !== opts.userId) return;

    const { data: msgs } = await admin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', opts.sessionId)
      .order('created_at', { ascending: false })
      .limit(EXTRACTION_HISTORY_LIMIT)
      .returns<Array<{ role: string; content: string }>>();

    const history = (msgs ?? [])
      .reverse()
      .filter(
        (m): m is { role: 'user' | 'assistant'; content: string } =>
          m.role === 'user' || m.role === 'assistant',
      );
    if (history.length === 0) return;

    const current = await loadUserMemory(admin, opts.userId);
    const next = await extractMemory({ history, currentItems: current });
    if (sameMemory(current, next)) return;
    await saveUserMemory(admin, opts.userId, next);
  } catch {
    // best-effort; 추출 실패가 대화를 막아서는 안 된다.
  }
}
