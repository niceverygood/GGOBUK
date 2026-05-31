import { CHEONGAN, JIJI } from '@/lib/saju/constants';
import { iljuProfileOf, type IljuProfile } from '@/lib/saju/ilju_profile';
import { SITE_NAME, absoluteUrl } from './site';

// 60갑자 일주 프로그래매틱 SEO.
//
// ilju_profile.ts 에 이미 60개 일주 각각의 성격·연애·직업·강점·주의·키워드가
// 작성되어 있다. 이를 검색 유입용 공개 페이지(/ilju/[slug])로 노출한다.
// "갑자일주 성격", "정사일주 연애" 같은 검색어는 "사주" 단일 키워드보다 경쟁이
// 낮으면서 사주 토픽 권위를 쌓아 도메인 전체 순위를 끌어올린다.

// CHEONGAN/JIJI 순서에 정렬된 로마자 (URL slug 용 — 한글 인코딩 대신 ASCII).
const GAN_ROMAN = [
  'gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye',
];
const JI_ROMAN = [
  'ja', 'chuk', 'in', 'myo', 'jin', 'sa', 'o', 'mi', 'sin', 'yu', 'sul', 'hae',
];

export interface IljuSeoEntry {
  slug: string;
  ganIdx: number;
  jiIdx: number;
  gan: string; // 천간 한글
  ji: string; // 지지 한글
  profile: IljuProfile;
}

function buildAll(): IljuSeoEntry[] {
  const list: IljuSeoEntry[] = [];
  for (let i = 0; i < 60; i += 1) {
    const ganIdx = i % 10;
    const jiIdx = i % 12;
    const profile = iljuProfileOf(ganIdx, jiIdx);
    if (!profile) continue;
    list.push({
      slug: `${GAN_ROMAN[ganIdx]}${JI_ROMAN[jiIdx]}`,
      ganIdx,
      jiIdx,
      gan: CHEONGAN[ganIdx],
      ji: JIJI[jiIdx],
      profile,
    });
  }
  return list;
}

export const ALL_ILJU: IljuSeoEntry[] = buildAll();

export const ILJU_INDEX_PATH = '/ilju';

export function iljuPath(slug: string): string {
  return `/ilju/${slug}`;
}

export function getIljuBySlug(slug: string): IljuSeoEntry | undefined {
  return ALL_ILJU.find((e) => e.slug === slug);
}

/** 사이트맵용 — 인덱스 + 60개 상세 경로. */
export const ILJU_PATHS: string[] = [
  ILJU_INDEX_PATH,
  ...ALL_ILJU.map((e) => iljuPath(e.slug)),
];

export function iljuTitle(e: IljuSeoEntry): string {
  return `${e.profile.name}일주(${e.profile.hanja}日柱) 성격·연애·직업 총정리`;
}

export function iljuDescription(e: IljuSeoEntry): string {
  return `${e.profile.name}일주(${e.profile.hanja}日柱)의 성격과 자존감, 연애·결혼, 일·재물 흐름, 강점과 조심할 점을 꼬북점이 쉽게 정리했습니다. ${e.profile.ego}`;
}

export function iljuFaqs(
  e: IljuSeoEntry,
): Array<{ question: string; answer: string }> {
  const n = e.profile.name;
  return [
    {
      question: `${n}일주는 어떤 성격인가요?`,
      answer: `${e.profile.ego} 일간 ${e.gan}의 결로 ${e.profile.ganNote.toLowerCase()}.`,
    },
    {
      question: `${n}일주의 연애·결혼운은 어떤가요?`,
      answer: `${e.profile.love} 일지 ${e.ji}는 배우자궁으로, ${e.profile.jiNote}.`,
    },
    {
      question: `${n}일주가 조심할 점은 무엇인가요?`,
      answer: `${e.profile.watch.join(' ')} 강점인 ${e.profile.strengths.join(', ')}을(를) 살리는 방향이 좋습니다.`,
    },
  ];
}

export function iljuJsonLd(e: IljuSeoEntry) {
  const path = iljuPath(e.slug);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: iljuTitle(e),
      description: iljuDescription(e),
      inLanguage: 'ko-KR',
      mainEntityOfPage: absoluteUrl(path),
      about: `${e.profile.name}일주`,
      keywords: [
        `${e.profile.name}일주`,
        `${e.profile.name}일주 성격`,
        `${e.profile.name}일주 연애`,
        '일주',
        '60갑자',
        '사주',
      ].join(', '),
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
      mainEntity: iljuFaqs(e).map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
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
          name: '60갑자 일주 사전',
          item: absoluteUrl(ILJU_INDEX_PATH),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: `${e.profile.name}일주`,
          item: absoluteUrl(path),
        },
      ],
    },
  ];
}
