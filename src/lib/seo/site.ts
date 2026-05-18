export const SITE_NAME = '꼬북점';
export const SITE_TAGLINE = '등껍질을 두드리면 답이 나온다';
export const SITE_DESCRIPTION =
  '꼬북점은 생년월일과 태어난 시간을 바탕으로 사주, 오행, 십성, 궁합, 대운, 오늘의 운세를 AI가 쉽고 깊게 풀어주는 사주 풀이 서비스입니다.';

export const SITE_KEYWORDS = [
  '사주',
  '사주풀이',
  '무료 사주',
  '오늘의 운세',
  '궁합',
  '점',
  '운세',
  '대운',
  '오행',
  '십성',
  'AI 사주',
  '사주 상담',
  '택일',
  '길일',
  '만세력',
  '꼬북점',
];

export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || 'https://ggobuk.vercel.app'
).replace(/\/$/, '');

export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
