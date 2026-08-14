import { SITE_NAME, absoluteUrl } from './site';

export interface SeoPage {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  keywords: string[];
  sections: Array<{ heading: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

export const SEO_PAGES: SeoPage[] = [
  {
    slug: 'saju',
    path: '/saju',
    title: '사주 풀이 | 생년월일로 보는 AI 사주 해석',
    description:
      '생년월일과 태어난 시간으로 사주팔자, 오행, 십성, 일주를 한 번에 풀이합니다. 꼬북점에서 내 사주의 강점과 조심할 점을 확인해보세요.',
    h1: '사주 풀이, 내 등껍질에 새겨진 흐름을 읽다',
    eyebrow: 'AI 사주 · 만세력 · 오행 분석',
    intro:
      '꼬북점은 사주팔자 원국을 계산한 뒤 오행 분포, 십성, 일주를 연결해 사용자가 실제 생활에서 체감할 수 있는 언어로 풀이합니다.',
    keywords: ['사주', '사주 풀이', 'AI 사주', '만세력'],
    sections: [
      {
        heading: '사주팔자 원국을 먼저 계산합니다',
        body: '연주, 월주, 일주, 시주의 여덟 글자를 기준으로 일간과 일지를 확인하고, 원국 안에서 어떤 기운이 강하고 부족한지 분석합니다.',
      },
      {
        heading: '오행과 십성을 현실 언어로 번역합니다',
        body: '목·화·토·금·수의 균형과 비견, 식신, 정재, 정관 같은 십성이 성격, 일, 관계, 돈의 흐름에서 어떻게 나타나는지 설명합니다.',
      },
      {
        heading: '결과는 저장하고 다시 볼 수 있습니다',
        body: '총평, 오행, 일주, 재물운, 연애와 결혼, 직업과 적성 등 카테고리별 해설을 보관함에서 다시 확인할 수 있습니다.',
      },
    ],
    faqs: [
      {
        question: '사주 풀이에 태어난 시간이 꼭 필요한가요?',
        answer:
          '태어난 시간이 있으면 시주까지 계산되어 더 정밀합니다. 시간을 모르는 경우에도 연주, 월주, 일주 중심으로 기본 흐름을 볼 수 있습니다.',
      },
      {
        question: '꼬북점 사주 풀이는 무료인가요?',
        answer:
          '카카오 로그인 후 사주를 등록할 수 있고, 깊은 AI 정밀 리포트는 꼬북알을 사용해 생성합니다.',
      },
    ],
  },
  {
    slug: 'today-fortune',
    path: '/today-fortune',
    title: '오늘의 운세 | 내 사주에 맞춘 일일운세',
    description:
      '오늘의 일진과 내 사주를 연결해 하루의 흐름, 추천 행동, 주의할 점, 행운 색상과 방향을 알려드립니다.',
    h1: '오늘의 운세, 내 사주에 맞춘 하루의 힌트',
    eyebrow: '일일운세 · 일진 · 행운 방향',
    intro:
      '오늘의 운세는 모두에게 같은 문장을 보여주는 방식이 아니라, 내 일간과 오늘의 일진을 연결해 하루의 기운을 읽습니다.',
    keywords: ['오늘의 운세', '일일운세', '무료 운세', '운세', '점'],
    sections: [
      {
        heading: '오늘의 일진을 내 사주와 비교합니다',
        body: '오늘 들어오는 천간과 지지가 내 원국의 어떤 글자를 자극하는지 살펴 하루의 감정, 집중력, 관계 흐름을 해석합니다.',
      },
      {
        heading: '행운 색상과 방향을 함께 제공합니다',
        body: '부족한 오행을 보완하거나 과한 기운을 누그러뜨리는 색상, 방향, 행동을 생활 조언으로 정리합니다.',
      },
      {
        heading: '짧지만 실천 가능한 운세를 지향합니다',
        body: '긴 예언보다 오늘 바로 써먹을 수 있는 행동, 피하면 좋은 선택, 마음가짐을 중심으로 안내합니다.',
      },
    ],
    faqs: [
      {
        question: '오늘의 운세는 매일 달라지나요?',
        answer:
          '네. 날짜별 일진이 달라지므로 내 사주와 만나는 방식도 매일 달라집니다.',
      },
      {
        question: '운세를 꼭 믿어야 하나요?',
        answer:
          '운세는 결정을 대신하는 답이 아니라 하루를 점검하는 참고 도구입니다. 중요한 선택은 현실 정보와 함께 판단하는 것이 좋습니다.',
      },
    ],
  },
  ];

export const SEO_PATHS = [
  '/',
  ...SEO_PAGES.map((page) => page.path),
];

export function getSeoPage(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((page) => page.slug === slug);
}

export function getSeoJsonLd(page: SeoPage) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.description,
      inLanguage: 'ko-KR',
      mainEntityOfPage: absoluteUrl(page.path),
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        logo: absoluteUrl('/icons/icon-512.png'),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: SITE_NAME,
          item: absoluteUrl('/'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.h1,
          item: absoluteUrl(page.path),
        },
      ],
    },
  ];
}
