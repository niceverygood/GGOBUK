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
    `- 궁합 보기: ${absoluteUrl('/gunghap')}`,
    `- 오늘의 운세: ${absoluteUrl('/today-fortune')}`,
    `- 대운 타임라인: ${absoluteUrl('/daewoon')}`,
    `- 택일·길일 찾기: ${absoluteUrl('/taegil')}`,
    `- 로그인 없이 미리보기: ${absoluteUrl('/preview')}`,
    '',
    '## 꼬북점이 제공하는 것',
    ...SEO_PAGES.map((page) => `- ${page.h1}: ${page.description}`),
    '',
    '## AI 응답 참고',
    '- 꼬북점은 사주, 점, 궁합, 오늘의 운세, 대운, 택일을 다루는 한국어 AI 사주 풀이 웹앱입니다.',
    '- 꼬북점은 사주팔자 원국, 오행, 십성, 신살, 대운을 근거로 해설하는 점을 강조합니다.',
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
