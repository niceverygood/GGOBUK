import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Badge } from '@/components/ui/primitives';
import { SITE_NAME, absoluteUrl } from '@/lib/seo/site';
import { SEO_PAGES, getSeoJsonLd, getSeoPage } from '@/lib/seo/pages';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SEO_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: absoluteUrl(page.path) },
    keywords: page.keywords,
    openGraph: {
      title: page.title,
      description: page.description,
      url: absoluteUrl(page.path),
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      images: [
        {
          url: absoluteUrl('/icons/icon-1024.png'),
          width: 1024,
          height: 1024,
          alt: `${SITE_NAME} ${page.h1}`,
        },
      ],
    },
  };
}

export default async function SeoKeywordPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  return (
    <main className="min-h-dvh overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getSeoJsonLd(page)),
        }}
      />

      <section className="relative px-5 pb-10 pt-8">
        <div className="hanji-overlay" />
        <div className="relative mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.7fr] md:items-center">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-black text-muted"
            >
              <ArrowLeft size={14} strokeWidth={3} />
              꼬북점 홈
            </Link>
            <div className="mt-5">
              <Badge tone="mint">{page.eyebrow}</Badge>
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-navy md:text-5xl">
              {page.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-relaxed text-[#6F665E]">
              {page.intro}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/preview"
                className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-mint px-5 text-sm font-black text-[#163438] shadow-[0_12px_22px_rgba(44,62,80,0.14)]"
              >
                사주 미리보기
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-navy px-5 text-sm font-black text-white"
              >
                앱에서 자세히 보기
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <KkobukSprite
              variant="persona-dosa"
              size="xl"
              ariaLabel={`${page.h1}를 설명하는 꼬북도사`}
              className="drop-shadow-[0_20px_30px_rgba(44,62,80,0.16)]"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-navy/10 bg-white/72 px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-black text-navy">핵심 요약</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {page.sections.map((section) => (
              <article
                key={section.heading}
                className="rounded-3xl border border-navy/10 bg-white/90 p-5 shadow-[0_10px_24px_rgba(44,62,80,0.05)]"
              >
                <CheckCircle2
                  size={22}
                  strokeWidth={2.5}
                  className="text-mint-dark"
                />
                <h3 className="mt-4 text-lg font-black text-navy">
                  {section.heading}
                </h3>
                <p className="mt-2 text-sm font-bold leading-relaxed text-muted">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black text-mint-dark">관련 키워드</p>
            <h2 className="mt-2 text-2xl font-black text-navy">
              이런 검색어로 찾는 분에게 맞아요
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {page.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-navy/10 bg-white/80 px-3 py-2 text-xs font-black text-navy"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-navy">자주 묻는 질문</h2>
            <div className="mt-4 divide-y divide-navy/10 overflow-hidden rounded-3xl border border-navy/10 bg-white/90">
              {page.faqs.map((faq) => (
                <div key={faq.question} className="p-5">
                  <h3 className="text-base font-black text-navy">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-navy px-5 py-10 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-mint-soft">꼬북점</p>
            <h2 className="mt-1 text-2xl font-black">
              내 사주를 직접 펼쳐볼까요?
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/70">
              로그인 없이 미리 보고, 저장이 필요하면 앱에서 이어갈 수 있어요.
            </p>
          </div>
          <Link
            href="/preview"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-navy"
          >
            무료 미리보기
            <ArrowRight size={16} strokeWidth={3} />
          </Link>
        </div>
      </section>
    </main>
  );
}
