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

/** 오늘이 속한 달을 KST 기준 'YYYY-MM' 으로. 월별 사주풀이의 키. */
export function currentYearMonthKst(): string {
  const d = nowKstDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' → 'N월' (사용자 노출용) */
export function formatYearMonthLabel(yearMonth: string): string {
  const month = Number(yearMonth.split('-')[1]);
  return Number.isFinite(month) ? `${month}월` : yearMonth;
}

export function formatKoreanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
