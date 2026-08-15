/**
 * 안정적인 에러 코드 — HTTP status 와 분리한다 (§13).
 *
 * 규칙
 *  - 서버는 이 코드만 내보낸다. LLM 응답·DB 메시지·스택을 그대로 노출하지 않는다.
 *  - 사용자 문구는 **클라이언트가** 코드로 번역한다. 서버 문구를 그대로 그리지 않는다.
 *  - 코드는 계약이다. 한 번 쓰면 의미를 바꾸지 말고 새 코드를 추가한다.
 *
 * `src/domain` 규약: Next / DB / LLM 을 import 하지 않는다.
 */

export const ERROR_CODES = [
  // 인증·권한
  'unauthorized',
  'kakao_login_required',
  'forbidden',

  // 입력
  'bad_request',
  'invalid_profile_id',
  'unsupported_month',
  'unsupported_year',
  'invalid_date_range',

  // 리소스
  'profile_not_found',
  'no_profile',
  'report_not_found',
  'service_not_found',
  'feature_disabled',

  // 동의
  'ai_consent_required',

  // 과금
  'insufficient_credits',
  'insufficient_leaf',
  'insufficient_chat_turns',
  'spend_failed',
  'exchange_failed',

  // 생성
  'generation_failed',
  'generation_timeout',
  'llm_not_configured',
  'save_failed',

  // 흐름 제어
  'rate_limited',
  'already_in_progress',
  'invalid_state_transition',

  // 서버
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** 코드 → 기본 HTTP status. 라우트가 필요하면 개별 override 한다. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  kakao_login_required: 401,
  forbidden: 403,

  bad_request: 400,
  invalid_profile_id: 400,
  unsupported_month: 400,
  unsupported_year: 400,
  invalid_date_range: 400,

  profile_not_found: 404,
  no_profile: 404,
  report_not_found: 404,
  service_not_found: 404,
  feature_disabled: 404, // 존재를 숨긴다 (403 은 "있는데 막힘"을 노출)

  ai_consent_required: 412,

  insufficient_credits: 402,
  insufficient_leaf: 402,
  insufficient_chat_turns: 402,
  spend_failed: 500,
  exchange_failed: 500,

  generation_failed: 500,
  generation_timeout: 504,
  llm_not_configured: 503,
  save_failed: 500,

  rate_limited: 429,
  already_in_progress: 409,
  invalid_state_transition: 409,

  internal_error: 500,
};

/**
 * 사용자 노출 문구 — 클라이언트가 이 맵으로 번역한다.
 * 꼬북이 톤(반말)이 아니라 **시스템 안내 톤(존댓말)** 을 쓴다.
 * 캐릭터 말투는 콘텐츠의 몫이고, 오류는 명확함이 우선이다.
 */
export const ERROR_MESSAGE_KO: Record<ErrorCode, string> = {
  unauthorized: '로그인이 필요해요.',
  kakao_login_required: '카카오 계정으로 다시 로그인해 주세요.',
  forbidden: '권한이 없어요.',

  bad_request: '요청 형식이 올바르지 않아요.',
  invalid_profile_id: '프로필을 찾을 수 없어요.',
  unsupported_month: '지금은 이번 달만 볼 수 있어요.',
  unsupported_year: '지원하지 않는 연도예요.',
  invalid_date_range: '날짜 범위를 다시 확인해 주세요.',

  profile_not_found: '프로필을 찾을 수 없어요.',
  no_profile: '먼저 사주를 등록해 주세요.',
  report_not_found: '결과를 찾을 수 없어요.',
  service_not_found: '준비되지 않은 기능이에요.',
  feature_disabled: '준비되지 않은 기능이에요.',

  ai_consent_required: 'AI 사용에 먼저 동의해 주세요.',

  insufficient_credits: '꼬북알이 부족해요.',
  insufficient_leaf: '꼬북잎이 부족해요.',
  insufficient_chat_turns: '남은 질문 횟수가 없어요.',
  spend_failed: '결제 처리에 실패했어요. 잠시 후 다시 시도해 주세요.',
  exchange_failed: '교환에 실패했어요. 잠시 후 다시 시도해 주세요.',

  generation_failed: '풀이를 만들지 못했어요. 사용한 재화는 돌려드렸어요.',
  generation_timeout: '시간이 오래 걸리고 있어요. 잠시 후 보관함에서 확인해 주세요.',
  llm_not_configured: '지금은 풀이를 만들 수 없어요. 잠시 후 다시 시도해 주세요.',
  save_failed: '결과 저장에 실패했어요. 사용한 재화는 돌려드렸어요.',

  rate_limited: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.',
  already_in_progress: '이미 만들고 있어요. 잠시만 기다려 주세요.',
  invalid_state_transition: '지금 상태에서는 할 수 없는 동작이에요.',

  internal_error: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
};

export function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}

/** 알 수 없는 코드도 안전하게 문구로 (서버가 새 코드를 먼저 배포한 경우 대비). */
export function errorMessageKo(code: string): string {
  return isErrorCode(code)
    ? ERROR_MESSAGE_KO[code]
    : ERROR_MESSAGE_KO.internal_error;
}
