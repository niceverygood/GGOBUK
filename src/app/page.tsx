import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  HeartHandshake,
  MessageCircle,
  ScrollText,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { KkobukSprite } from "@/components/kkobuk/KkobukSprite";
import { Badge } from "@/components/ui/primitives";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo/site";
import { SEO_PAGES } from "@/lib/seo/pages";

export const metadata: Metadata = {
  title: {
    absolute: "꼬북점 | 사주·점·궁합·오늘의 운세 AI 풀이",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
  keywords: SITE_KEYWORDS,
  openGraph: {
    title: "꼬북점 | 사주·점·궁합·오늘의 운세 AI 풀이",
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: absoluteUrl("/icons/icon-1024.png"),
        width: 1024,
        height: 1024,
        alt: "꼬북점 사주 풀이 캐릭터",
      },
    ],
  },
};

const FEATURES = [
  {
    title: "사주 풀이",
    body: "사주팔자, 오행, 십성, 일주를 근거표와 함께 풀어줍니다.",
    href: "/saju",
    icon: ScrollText,
  },
  {
    title: "궁합 보기",
    body: "연인, 친구, 가족의 오행 보완과 합충을 관계 언어로 설명합니다.",
    href: "/gunghap",
    icon: HeartHandshake,
  },
  {
    title: "오늘의 운세",
    body: "오늘의 일진을 내 사주와 연결해 하루의 힌트를 제공합니다.",
    href: "/today-fortune",
    icon: Sparkles,
  },
  {
    title: "대운 타임라인",
    body: "10년 단위 인생 흐름과 다음 시기의 준비 방향을 보여줍니다.",
    href: "/daewoon",
    icon: Waypoints,
  },
  {
    title: "택일·길일",
    body: "이사, 계약, 시작일처럼 중요한 날짜의 후보를 비교합니다.",
    href: "/taegil",
    icon: CalendarCheck,
  },
  {
    title: "꼬북 상담",
    body: "저장된 사주를 바탕으로 연애, 일, 관계 질문을 이어갑니다.",
    href: "/chat",
    icon: MessageCircle,
  },
];

const FAQS = [
  {
    question: "꼬북점은 어떤 사주 서비스인가요?",
    answer:
      "꼬북점은 생년월일과 태어난 시간을 바탕으로 사주팔자, 오행, 십성, 궁합, 대운, 오늘의 운세를 AI가 풀이하는 온라인 사주 서비스입니다.",
  },
  {
    question: "로그인 없이 사주를 볼 수 있나요?",
    answer:
      "로그인 없이 미리보기에서 사주 구조를 확인할 수 있습니다. 저장, 채팅, 정밀 AI 리포트는 로그인 후 이용할 수 있습니다.",
  },
  {
    question: "사주와 점은 어떻게 다른가요?",
    answer:
      "꼬북점은 막연한 예언보다 사주 원국과 오행, 십성의 계산 근거를 보여주고 현실에서 체감되는 성향과 선택 포인트로 풀어줍니다.",
  },
];

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
      image: absoluteUrl("/icons/icon-1024.png"),
      offers: {
        "@type": "Offer",
        priceCurrency: "KRW",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "사주 풀이",
        "오늘의 운세",
        "궁합 보기",
        "대운 타임라인",
        "택일과 길일 추천",
        "AI 사주 상담",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icons/icon-512.png"),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <JsonLd />
      <section className="relative px-5 pb-14 pt-9">
        <div className="hanji-overlay" />
        <div className="relative mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <Badge tone="mint">AI 사주 · 궁합 · 오늘의 운세</Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-navy md:text-6xl">
              꼬북점 사주,
              <br />
              등껍질에 새겨진 흐름을 읽다
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-relaxed text-[#6F665E] md:text-lg">
              생년월일과 태어난 시간을 넣으면 사주팔자, 오행, 십성, 궁합, 대운,
              오늘의 운세를 근거가 보이는 리포트로 풀어줍니다. 막연한 점괘보다
              내 삶에서 체감되는 선택 포인트를 확인해보세요.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/preview"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-mint px-6 text-base font-black text-[#163438] shadow-[0_14px_26px_rgba(44,62,80,0.16)]"
              >
                로그인 없이 사주 미리보기
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-navy px-6 text-base font-black text-white shadow-[0_14px_26px_rgba(44,62,80,0.20)]"
              >
                내 꼬북점 시작하기
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-[12px] font-black text-navy">
              {["사주", "점", "궁합", "오늘의 운세", "대운", "택일"].map(
                (keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-navy/10 bg-white/70 px-3 py-2"
                  >
                    {keyword}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="relative flex min-h-[320px] items-end justify-center md:min-h-[520px]">
            <div className="absolute inset-x-6 bottom-6 h-32 rounded-[50%] bg-mint/20 blur-2xl" />
            <KkobukSprite
              variant="hero"
              size="hero"
              ariaLabel="꼬북점 사주 풀이 캐릭터 꼬북이"
              className="relative scale-110 md:scale-[1.38]"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-navy/10 bg-white/70 px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black text-mint-dark">검색 의도별 안내</p>
          <h2 className="mt-2 text-2xl font-black text-navy">
            사주, 점, 궁합, 운세를 한 곳에서
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, body, href, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="rounded-3xl border border-navy/10 bg-white/85 p-5 shadow-[0_10px_24px_rgba(44,62,80,0.06)] transition hover:border-mint/70"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint/15 text-navy">
                  <Icon size={22} strokeWidth={2.5} />
                </span>
                <h3 className="mt-4 text-lg font-black text-navy">{title}</h3>
                <p className="mt-2 text-sm font-bold leading-relaxed text-muted">
                  {body}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-black text-mint-dark">
                왜 꼬북점인가요
              </p>
              <h2 className="mt-2 text-2xl font-black leading-snug text-navy">
                검색엔진과 AI가 이해하기 쉬운, 근거 중심 사주 콘텐츠
              </h2>
              <p className="mt-3 text-sm font-bold leading-relaxed text-muted">
                꼬북점은 사용자가 보는 화면뿐 아니라 검색로봇과 AI가 읽는 구조도
                함께 정리합니다. 사주 관련 질문에 답할 수 있도록 카테고리별
                설명, FAQ, 구조화 데이터를 공개 페이지에 담았습니다.
              </p>
            </div>
            <div className="grid gap-3">
              {SEO_PAGES.map((page) => (
                <Link
                  key={page.slug}
                  href={page.path}
                  className="flex items-center justify-between gap-4 rounded-3xl border border-navy/10 bg-white/85 px-5 py-4 shadow-[0_10px_24px_rgba(44,62,80,0.05)]"
                >
                  <div>
                    <h3 className="text-base font-black text-navy">
                      {page.h1}
                    </h3>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
                      {page.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-mint-dark">
                    보기
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-navy px-5 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-black">자주 묻는 질문</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10"
              >
                <h3 className="text-sm font-black">{faq.question}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white/75">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
