import { SITE_NAME, absoluteUrl } from "./site";

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
    slug: "saju",
    path: "/saju",
    title: "사주 풀이 | 생년월일로 보는 AI 사주 해석",
    description:
      "생년월일과 태어난 시간으로 사주팔자, 오행, 십성, 일주, 대운을 한 번에 풀이합니다. 꼬북점에서 내 사주의 강점과 조심할 점을 확인해보세요.",
    h1: "사주 풀이, 내 등껍질에 새겨진 흐름을 읽다",
    eyebrow: "AI 사주 · 만세력 · 오행 분석",
    intro:
      "꼬북점은 사주팔자 원국을 계산한 뒤 오행 분포, 십성, 일주, 대운을 연결해 사용자가 실제 생활에서 체감할 수 있는 언어로 풀이합니다.",
    keywords: ["사주", "사주 풀이", "무료 사주", "AI 사주", "만세력"],
    sections: [
      {
        heading: "사주팔자 원국을 먼저 계산합니다",
        body: "연주, 월주, 일주, 시주의 여덟 글자를 기준으로 일간과 일지를 확인하고, 원국 안에서 어떤 기운이 강하고 부족한지 분석합니다.",
      },
      {
        heading: "오행과 십성을 현실 언어로 번역합니다",
        body: "목·화·토·금·수의 균형과 비견, 식신, 정재, 정관 같은 십성이 성격, 일, 관계, 돈의 흐름에서 어떻게 나타나는지 설명합니다.",
      },
      {
        heading: "결과는 저장하고 다시 볼 수 있습니다",
        body: "총평, 오행, 일주, 재물운, 연애와 결혼, 직업과 적성 등 카테고리별 해설을 보관함에서 다시 확인할 수 있습니다.",
      },
    ],
    faqs: [
      {
        question: "사주 풀이에 태어난 시간이 꼭 필요한가요?",
        answer:
          "태어난 시간이 있으면 시주까지 계산되어 더 정밀합니다. 시간을 모르는 경우에도 연주, 월주, 일주 중심으로 기본 흐름을 볼 수 있습니다.",
      },
      {
        question: "꼬북점 사주 풀이는 무료인가요?",
        answer:
          "로그인 없이 미리보기로 기본 사주 구조를 확인할 수 있고, 깊은 AI 정밀 리포트는 크래딧을 사용해 생성합니다.",
      },
    ],
  },
  {
    slug: "gunghap",
    path: "/gunghap",
    title: "궁합 보기 | 연인·친구·가족 인연 지도",
    description:
      "두 사람의 사주를 비교해 오행의 보완, 일주 합충, 관계의 장점과 충돌 지점을 풀이합니다. 연인, 친구, 가족 궁합을 꼬북점에서 확인하세요.",
    h1: "궁합 보기, 두 사람의 기운이 만나는 지점",
    eyebrow: "궁합 · 인연 지도 · 관계 분석",
    intro:
      "꼬북점의 궁합은 점수만 보여주지 않고 두 사람의 오행 온도, 일주 관계, 합과 충, 서로에게 필요한 기운을 함께 설명합니다.",
    keywords: ["궁합", "궁합 보기", "연인 궁합", "사주 궁합", "인연"],
    sections: [
      {
        heading: "두 사주의 오행 온도를 비교합니다",
        body: "한 사람에게 부족한 기운을 상대가 채워주는지, 반대로 과한 기운이 충돌하는지 살펴 관계의 체감 온도를 설명합니다.",
      },
      {
        heading: "합과 충을 관계 언어로 풀어냅니다",
        body: "합은 끌림과 협력, 충은 변화와 긴장으로 해석해 실제 대화 방식과 갈등 패턴에 연결합니다.",
      },
      {
        heading: "연인뿐 아니라 가족과 친구도 볼 수 있습니다",
        body: "부모, 자녀, 친구, 동료처럼 관계 맥락에 따라 서로의 기대와 조심할 점을 다르게 읽습니다.",
      },
    ],
    faqs: [
      {
        question: "궁합 점수가 높으면 무조건 좋은 관계인가요?",
        answer:
          "점수는 참고 지표입니다. 꼬북점은 보완되는 기운과 충돌 지점을 함께 보여주어 관계를 더 잘 다루는 방향을 제안합니다.",
      },
      {
        question: "가족이나 친구 궁합도 볼 수 있나요?",
        answer:
          "네. 인연 지도에 가족, 친구, 연인, 동료를 추가해 관계별 궁합 리포트를 확인할 수 있습니다.",
      },
    ],
  },
  {
    slug: "today-fortune",
    path: "/today-fortune",
    title: "오늘의 운세 | 내 사주에 맞춘 일일운세",
    description:
      "오늘의 일진과 내 사주를 연결해 하루의 흐름, 추천 행동, 주의할 점, 행운 색상과 방향을 알려드립니다.",
    h1: "오늘의 운세, 내 사주에 맞춘 하루의 힌트",
    eyebrow: "일일운세 · 일진 · 행운 방향",
    intro:
      "오늘의 운세는 모두에게 같은 문장을 보여주는 방식이 아니라, 내 일간과 오늘의 일진을 연결해 하루의 기운을 읽습니다.",
    keywords: ["오늘의 운세", "일일운세", "무료 운세", "운세", "점"],
    sections: [
      {
        heading: "오늘의 일진을 내 사주와 비교합니다",
        body: "오늘 들어오는 천간과 지지가 내 원국의 어떤 글자를 자극하는지 살펴 하루의 감정, 집중력, 관계 흐름을 해석합니다.",
      },
      {
        heading: "행운 색상과 방향을 함께 제공합니다",
        body: "부족한 오행을 보완하거나 과한 기운을 누그러뜨리는 색상, 방향, 행동을 생활 조언으로 정리합니다.",
      },
      {
        heading: "짧지만 실천 가능한 운세를 지향합니다",
        body: "긴 예언보다 오늘 바로 써먹을 수 있는 행동, 피하면 좋은 선택, 마음가짐을 중심으로 안내합니다.",
      },
    ],
    faqs: [
      {
        question: "오늘의 운세는 매일 달라지나요?",
        answer:
          "네. 날짜별 일진이 달라지므로 내 사주와 만나는 방식도 매일 달라집니다.",
      },
      {
        question: "운세를 꼭 믿어야 하나요?",
        answer:
          "운세는 결정을 대신하는 답이 아니라 하루를 점검하는 참고 도구입니다. 중요한 선택은 현실 정보와 함께 판단하는 것이 좋습니다.",
      },
    ],
  },
  {
    slug: "daewoon",
    path: "/daewoon",
    title: "대운 타임라인 | 10년 단위 사주 흐름 보기",
    description:
      "대운은 10년 단위로 흐르는 큰 운의 계절입니다. 꼬북점에서 현재 대운, 다음 대운, 준비할 방향을 확인하세요.",
    h1: "대운 타임라인, 10년 단위 인생 흐름을 읽다",
    eyebrow: "대운 · 10년 운세 · 인생 흐름",
    intro:
      "대운은 매일의 운세보다 긴 호흡으로 삶의 배경을 바꾸는 흐름입니다. 꼬북점은 현재 대운과 앞으로의 대운을 한눈에 볼 수 있게 정리합니다.",
    keywords: ["대운", "대운 풀이", "10년 운세", "사주 대운", "인생 흐름"],
    sections: [
      {
        heading: "현재 내가 지나고 있는 계절을 봅니다",
        body: "현재 나이와 대운 시작 연도를 기준으로 지금의 십성, 오행, 기운의 방향을 확인합니다.",
      },
      {
        heading: "다음 10년을 미리 준비합니다",
        body: "앞으로 강해질 기운을 살펴 직업, 관계, 돈, 공부에서 어떤 준비가 필요한지 제안합니다.",
      },
      {
        heading: "과거 흐름도 다시 해석할 수 있습니다",
        body: "지나온 대운을 되짚어 반복된 사건과 선택 패턴을 이해하고 앞으로의 방향을 잡는 데 활용합니다.",
      },
    ],
    faqs: [
      {
        question: "대운은 언제 바뀌나요?",
        answer:
          "개인의 사주 계산에 따라 대운 시작 나이가 달라집니다. 꼬북점은 계산된 대운 구간을 타임라인으로 보여줍니다.",
      },
      {
        question: "대운이 안 좋으면 피할 수 없나요?",
        answer:
          "대운은 분위기와 과제를 보여주는 참고 정보입니다. 조심할 지점과 활용법을 알면 같은 흐름도 다르게 사용할 수 있습니다.",
      },
    ],
  },
  {
    slug: "taegil",
    path: "/taegil",
    title: "택일·길일 찾기 | 이사·계약·시작일 추천",
    description:
      "이사, 계약, 오픈, 고백, 시작일처럼 중요한 날을 정할 때 내 사주와 목적에 맞는 길일 후보를 확인하세요.",
    h1: "택일과 길일 찾기, 중요한 시작을 좋은 흐름에 맞추다",
    eyebrow: "택일 · 길일 · 좋은 날",
    intro:
      "꼬북점은 단순히 달력의 좋은 날만 고르는 것이 아니라, 내 사주와 목적을 함께 보고 이사, 계약, 시작일에 맞는 후보를 제안합니다.",
    keywords: ["택일", "길일", "좋은 날", "이사 날짜", "계약 날짜"],
    sections: [
      {
        heading: "목적에 따라 좋은 날의 기준이 달라집니다",
        body: "이사, 계약, 오픈, 고백, 공부 시작처럼 목적이 다르면 살펴야 할 기운과 피하고 싶은 충돌도 달라집니다.",
      },
      {
        heading: "내 사주와 날짜의 충돌을 함께 봅니다",
        body: "좋은 날이라도 개인 사주와 부딪히는 흐름이 있을 수 있어, 내 원국과의 관계를 같이 확인합니다.",
      },
      {
        heading: "후보 날짜를 비교해 선택할 수 있습니다",
        body: "여러 후보 중 점수가 높은 날과 그 이유를 함께 보여주어 사용자가 납득하고 선택할 수 있게 돕습니다.",
      },
    ],
    faqs: [
      {
        question: "택일은 어떤 일에 사용할 수 있나요?",
        answer:
          "이사, 계약, 개업, 고백, 공부 시작, 프로젝트 시작처럼 날짜 선택이 신경 쓰이는 일에 참고할 수 있습니다.",
      },
      {
        question: "길일 추천은 확정적인가요?",
        answer:
          "길일은 참고 지표입니다. 현실 일정, 건강, 계약 조건처럼 실제 조건과 함께 판단해야 합니다.",
      },
    ],
  },
];

export const SEO_PATHS = [
  "/",
  "/preview",
  ...SEO_PAGES.map((page) => page.path),
];

export function getSeoPage(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((page) => page.slug === slug);
}

export function getSeoJsonLd(page: SeoPage) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.h1,
      description: page.description,
      inLanguage: "ko-KR",
      mainEntityOfPage: absoluteUrl(page.path),
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/icons/icon-512.png"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: SITE_NAME,
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.h1,
          item: absoluteUrl(page.path),
        },
      ],
    },
  ];
}
