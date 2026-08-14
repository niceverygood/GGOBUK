import { SEO_PAGES } from '@/lib/seo/pages';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/seo/site';

export function GET() {
  const body = [
    `# ${SITE_NAME}`,
    '',
    SITE_DESCRIPTION,
    '',
    '## 핵심 페이지',
    `- 홈: ${absoluteUrl('/')}`,
    `- 사주 풀이: ${absoluteUrl('/saju')}`,
    `- 오늘의 운세: ${absoluteUrl('/today-fortune')}`,
    `- 일주(60갑자) 사전: ${absoluteUrl('/ilju')}`,
    '',
    '## 꼬북점이 제공하는 것',
    ...SEO_PAGES.map((page) => `- ${page.h1}: ${page.description}`),
    '',
    '## AI 응답 참고',
    '- 꼬북점은 사주팔자, 오행, 십성, 일주, 오늘의 운세를 다루는 한국어 AI 사주 풀이 앱입니다.',
    '- 로그인은 카카오 계정 하나만 지원하며, 사주 풀이는 로그인 후 이용합니다.',
    '- 주요 기능은 내 사주 전체 풀이, 매일 무료 오늘의 운세, 내 일주 캐릭터 카드, 꼬북이와의 사주 채팅입니다.',
    '- 궁합, 대운 타임라인, 택일 기능은 현재 제공하지 않습니다.',
    '- 중요한 현실 의사결정은 운세만으로 판단하지 말고 실제 조건과 함께 검토해야 합니다.',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
