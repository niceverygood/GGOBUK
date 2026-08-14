/**
 * 월별 요약 파싱 — 순수 함수.
 *
 * `src/domain` 규약: Next / DB / LLM 을 import 하지 않는다.
 * 서버(생성)와 클라이언트(렌더) 양쪽이 같은 파서를 쓰기 위해 여기에 둔다.
 * LLM 프롬프트 계약은 `src/lib/llm/monthly.ts` 의 SUMMARY_SYSTEM 참조.
 */

export interface MonthlySummary {
  flow: string;
  good: string;
  watch: string;
}

/** 3줄 요약을 화면용으로 파싱. 형식이 깨져도 최대한 살려서 돌려준다. */
export function parseMonthlySummary(content: string): MonthlySummary {
  const pick = (label: string) => {
    const m = content.match(new RegExp(`${label}\\s*[:：]\\s*(.+)`));
    return m?.[1]?.trim() ?? '';
  };
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    flow: pick('흐름') || lines[0] || '',
    good: pick('기운') || lines[1] || '',
    watch: pick('주의') || lines[2] || '',
  };
}
