import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { SITE_NAME, absoluteUrl } from '@/lib/seo/site';
import {
  ALL_ILJU,
  ILJU_INDEX_PATH,
  iljuPath,
} from '@/lib/seo/ilju_seo';
import { CHEONGAN } from '@/lib/saju/constants';

const TITLE = '60갑자 일주 사전 | 일주별 성격·연애·직업 총정리';
const DESCRIPTION =
  '갑자일주부터 계해일주까지 60갑자 일주 각각의 성격, 연애·결혼, 일·재물 흐름을 한 곳에서 확인하세요. 내 일주가 어떤 결인지 꼬북점이 쉽게 풀어드립니다.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl(ILJU_INDEX_PATH) },
  keywords: ['일주', '60갑자', '일주별 성격', '갑자일주', '일주 사전', '사주'],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(ILJU_INDEX_PATH),
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: absoluteUrl('/icons/icon-1024.png'),
        width: 1024,
        height: 1024,
        alt: `${SITE_NAME} 60갑자 일주 사전`,
      },
    ],
  },
};

function jsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: 'ko-KR',
      url: absoluteUrl(ILJU_INDEX_PATH),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: ALL_ILJU.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${e.profile.name}일주`,
        url: absoluteUrl(iljuPath(e.slug)),
      })),
    },
  ];
}

export default function IljuIndexPage() {
  // 천간별 그룹 (갑→계, 각 6개).
  const groups = CHEONGAN.map((gan, ganIdx) => ({
    gan,
    items: ALL_ILJU.filter((e) => e.ganIdx === ganIdx),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="min-h-dvh overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      <section className="relative px-5 pb-8 pt-8">
        <div className="hanji-overlay" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-black text-muted"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            꼬북점 홈
          </Link>
          <div className="mt-5">
            <Badge tone="mint">60갑자 · 일주 사전</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-navy md:text-5xl">
            60갑자 일주 사전
          </h1>
          <p className="mt-4 max-w-2xl text-base font-bold leading-relaxed text-[#6F665E]">
            {DESCRIPTION}
          </p>
        </div>
      </section>

      <section className="px-5 pb-14">
        <div className="mx-auto max-w-5xl space-y-8">
          {groups.map((g) => (
            <div key={g.gan}>
              <h2 className="text-lg font-black text-navy">{g.gan} 일간</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
                {g.items.map((e) => (
                  <Link
                    key={e.slug}
                    href={iljuPath(e.slug)}
                    className="rounded-2xl border border-navy/10 bg-white/85 p-3 text-center transition hover:border-mint/70"
                  >
                    <span className="font-hanja text-lg font-black text-navy">
                      {e.profile.hanja}
                    </span>
                    <p className="mt-1 text-[13px] font-black text-navy">
                      {e.profile.name}일주
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
