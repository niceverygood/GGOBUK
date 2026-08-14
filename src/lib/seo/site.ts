export const SITE_NAME = '꼬북점';
export const SITE_TAGLINE = '등껍질을 두드리면 답이 나온다';
export const SITE_DESCRIPTION =
  '꼬북점은 생년월일과 태어난 시간을 바탕으로 사주팔자, 오행, 십성, 일주와 오늘의 운세를 AI가 쉽게 풀어주는 사주 풀이 앱입니다. 풀이를 읽은 뒤 꼬북이와 대화로 이어서 물어볼 수 있습니다.';

// ⚠️ 실제로 제공하는 기능만 넣는다. 없는 기능(궁합·대운·택일)을 키워드로 태우면
//    유입 후 즉시 이탈하고, 스토어 심사에서도 메타데이터 불일치로 지적된다.
export const SITE_KEYWORDS = [
  '사주',
  '사주풀이',
  '무료 사주',
  '오늘의 운세',
  '일주',
  '60갑자',
  '운세',
  '오행',
  '십성',
  '만세력',
  'AI 사주',
  '사주 채팅',
  '꼬북점',
];

export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || 'https://ggobuk.vercel.app'
).replace(/\/$/, '');

export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
