// 페르소나별 로딩 멘트 — 캐릭터가 풀이를 준비하는 동작으로 보이도록.
//
// AnalysisLoader의 steps에 그대로 꽂아 쓰는 형태. eyebrow와 함께 사용하면
// "꼬북도사가 책 펴는 중" 같은 캐릭터 액션감으로 대기시간이 즐거워진다.

import type { AnalysisStep } from '@/components/ui/AnalysisLoader';
import type { PersonaKey } from './personas';

const DOSA_STEPS: AnalysisStep[] = [
  { at: 0, title: '수염 한 번 쓸어내리며…', body: '낡은 명리서를 꺼내는 중.' },
  { at: 0.14, title: '책상 위 사주판 펼치는 중', body: '연·월·일·시 네 기둥을 다시 정렬 중.' },
  { at: 0.3, title: '붓에 먹 묻히는 중', body: '근거 표를 한 칸씩 채워가는 중.' },
  { at: 0.46, title: '허허, 자네 일주 살피는 중', body: '일간과 일지의 결을 가만히 읽는 중.' },
  { at: 0.62, title: '대운·세운 줄긋는 중', body: '10년 흐름을 사주판에 옮겨 적는 중.' },
  { at: 0.78, title: '한 줄 결론 다듬는 중', body: '핵심을 한 문장으로 압축하는 중.' },
  { at: 0.93, title: '곧 펴서 보여주겠네…', body: '마지막으로 한 번 더 살펴보는 중.' },
];

const BOSAL_STEPS: AnalysisStep[] = [
  { at: 0, title: '물 한 잔 떠놓는 중', body: '마음 가다듬으며 당신 이야기 듣는 중.' },
  { at: 0.16, title: '염주 한 알 굴리는 중', body: '당신의 결을 가만히 느껴보는 중.' },
  { at: 0.34, title: '눈 감고 마음 읽는 중', body: '사주가 가리키는 무게를 함께 느끼는 중.' },
  { at: 0.52, title: '따뜻한 차 우려내는 중', body: '편안하게 풀어줄 말을 골라보는 중.' },
  { at: 0.7, title: '한 단락씩 정리 중', body: '날카로운 부분을 부드럽게 다듬는 중.' },
  { at: 0.86, title: '마지막 한 줄 적는 중', body: '오늘 해볼 수 있는 작은 친절 고르는 중.' },
  { at: 0.94, title: '잠시만요…', body: '곧 전해드릴게요.' },
];

const MUDANG_STEPS: AnalysisStep[] = [
  { at: 0, title: '방울 한 번 흔드는 중', body: '신호 들어오는 중.' },
  { at: 0.18, title: '오늘 운 어디서 오는지 보는 중', body: '대운·세운 한 번에 본다.' },
  { at: 0.38, title: '결론 하나 골라내는 중', body: '망설일 거 없이 핵심만.' },
  { at: 0.58, title: '근거 한 줄로 정리 중', body: '왜 그런지 짧게 박아둔다.' },
  { at: 0.78, title: '데드라인까지 박는 중', body: '언제까지 뭘 할지 명확하게.' },
  { at: 0.92, title: '거의 다 됐어', body: '바로 받아.' },
];

const KKOBUK_STEPS: AnalysisStep[] = [
  { at: 0, title: '사주판 펴는 중!', body: '연·월·일·시 네 기둥 정리 중.' },
  { at: 0.16, title: '거북이 등껍질 두드리는 중', body: '너의 결이 어떤지 살피는 중.' },
  { at: 0.34, title: '메모장에 적어두는 중', body: '쉬운 말로 풀어볼 거리 골라보는 중.' },
  { at: 0.52, title: "어디보자~ 흠흠", body: '오행 어디가 강한지 한 번 더 확인 중.' },
  { at: 0.7, title: '친구한테 보낼 말 다듬는 중', body: '어려운 말 빼고 자연스럽게.' },
  { at: 0.86, title: '오늘 해볼 작은 거 고르는 중', body: '진짜 한 가지만 잘 골라야 해.' },
  { at: 0.94, title: '거의 다 했어!', body: '곧 보여줄게~' },
];

export const PERSONA_LOADER_STEPS: Record<PersonaKey, AnalysisStep[]> = {
  kkobuk: KKOBUK_STEPS,
  mudang: MUDANG_STEPS,
  bosal: BOSAL_STEPS,
  dosa: DOSA_STEPS,
};

const EYEBROW: Record<PersonaKey, string> = {
  kkobuk: '꼬북이가 사주판 펴는 중',
  mudang: '꼬북무당이 방울 흔드는 중',
  bosal: '꼬북보살이 물 떠놓고 빌고 있는 중',
  dosa: '꼬북도사가 수염 쓸며 살피는 중',
};

export function loaderEyebrowFor(persona: PersonaKey): string {
  return EYEBROW[persona] ?? '꼬북이가 풀이 준비 중';
}
