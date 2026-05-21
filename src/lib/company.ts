// 사업자 정보 — 사업자등록증 / 통신판매업신고증 기준 (검증됨).
// 전자상거래법 표시 의무 + 카카오페이 가맹 심사에 사용.

export const COMPANY = {
  name: '주식회사 바틀',
  ceo: '한승수',
  bizRegNo: '376-87-01076',
  mailOrderNo: '제2019-성남분당B-0177호',
  address:
    '경기도 성남시 분당구 판교로289번길 20, 2동 8층 (삼평동, 판교테크노밸리 스타트업 캠퍼스)',
  // 고객 문의 채널 — 회사 도메인 이메일. 필요 시 전용 support 주소로 교체.
  contactEmail: 'dev@bottlecorp.kr',
  serviceName: '꼬북점',
} as const;

// 결제·환불 핵심 정책 (PRICING.md와 동기화). 결제 화면 고지 + 약관에 공통 사용.
export const PAYMENT_POLICY = {
  method: '카카오페이 (신용·체크카드 / 카카오머니)',
  currency: 'KRW (원화)',
  // 청약철회 / 환불
  refundWindowDays: 7,
  refundSummary:
    '결제 후 7일 이내 + 충전한 꼬북알을 전혀 사용하지 않은 경우 전액 환불됩니다. 1알이라도 사용한 경우 디지털 콘텐츠 특성상 청약철회·환불이 제한됩니다.',
  noAutoBilling: '정기결제(자동결제)는 사용하지 않으며, 모든 결제는 사용자가 직접 충전합니다.',
} as const;
