/**
 * 페르소나의 **화면 표시용** 메타데이터.
 *
 * ⚠️ 왜 별도 모듈인가
 * `src/lib/llm/personas.ts` 에는 systemPrompt 전문(자해 대응·몰입 규칙 등 안전가드 포함)이 들어 있다.
 * 클라이언트 컴포넌트가 그 모듈을 import 하면 **프롬프트 전문이 브라우저 JS 번들로 배포**되어
 * 가드 우회 설계가 쉬워진다. 표시용 이름만 필요한 UI 는 반드시 이 모듈을 쓴다.
 *
 * `src/domain` 규약: Next / DB / LLM 을 import 하지 않는다.
 */

export type PersonaDisplayKey = 'kkobuk' | 'dosa' | 'mudang' | 'bosal';

export interface PersonaDisplay {
  displayName: string;
  /** 한 줄 소개 — 채팅 헤더 등에서 사용 */
  tagline: string;
}

export const PERSONA_DISPLAY: Record<PersonaDisplayKey, PersonaDisplay> = {
  kkobuk: {
    displayName: '꼬북이',
    tagline: '내 사주를 아는 친구 · 무엇이든 물어봐',
  },
  dosa: {
    displayName: '꼬북도사',
    tagline: '명리 근거를 짚어주는 조언자',
  },
  mudang: {
    displayName: '꼬북무당',
    tagline: '직설적으로 결론부터',
  },
  bosal: {
    displayName: '꼬북보살',
    tagline: '따뜻하게 마음부터',
  },
};

export function personaDisplay(key: string): PersonaDisplay {
  return PERSONA_DISPLAY[key as PersonaDisplayKey] ?? PERSONA_DISPLAY.kkobuk;
}
