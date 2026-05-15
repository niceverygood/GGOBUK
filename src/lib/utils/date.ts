// KST date helpers. All times in the app are interpreted as Korea Standard Time (UTC+9).

const KST_OFFSET_MIN = 540;

export function nowKstDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + (KST_OFFSET_MIN + now.getTimezoneOffset()) * 60_000);
}

export function todayKstIso(): string {
  const d = nowKstDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatKoreanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
