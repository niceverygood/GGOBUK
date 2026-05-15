// Lookup helper for going from a 일간 (e.g., '정') back to its ohaeng label.
// Lightweight, used in views that only have `ilgan` string.
const MAP: Record<string, '목' | '화' | '토' | '금' | '수'> = {
  갑: '목',
  을: '목',
  병: '화',
  정: '화',
  무: '토',
  기: '토',
  경: '금',
  신: '금',
  임: '수',
  계: '수',
};

export function ohaengFromGan(gan: string | null): '목' | '화' | '토' | '금' | '수' {
  return MAP[gan ?? ''] ?? '토';
}
