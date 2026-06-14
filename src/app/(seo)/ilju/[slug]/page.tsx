import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles, ShieldAlert } from 'lucide-react';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { ShareIljuButton } from '@/components/ilju/ShareIljuButton';
import { IljuSignupCta } from '@/components/ilju/IljuSignupCta';
import { Badge } from '@/components/ui/primitives';
import { iljuTheme } from '@/lib/saju/ilju_profile';
import { SITE_NAME, absoluteUrl } from '@/lib/seo/site';
import {
  ALL_ILJU,
  getIljuBySlug,
  iljuDescription,
  iljuFaqs,
  iljuJsonLd,
  iljuPath,
  iljuTitle,
} from '@/lib/seo/ilju_seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ALL_ILJU.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const e = getIljuBySlug(slug);
  if (!e) return {};
  const title = iljuTitle(e);
  const description = iljuDescription(e);
  const path = iljuPath(e.slug);
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    keywords: [
      `${e.profile.name}일주`,
      `${e.profile.name}일주 성격`,
      `${e.profile.name}일주 연애`,
      `${e.profile.name}일주 직업`,
      '일주',
      '60갑자',
      '사주',
    ],
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      images: [
        {
          url: absoluteUrl(`/api/og/ilju/${e.slug}`),
          // 실제 출력은 2x 슈퍼샘플(2400×1260, 1.91:1 동일) — 캐릭터 또렷하게.
          width: 2400,
          height: 1260,
          alt: `${e.profile.name}일주 사주 캐릭터 카드 · ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(`/api/og/ilju/${e.slug}`)],
    },
  };
}

export default async function IljuDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const e = getIljuBySlug(slug);
  if (!e) notFound();

  const { profile } = e;
  const theme = iljuTheme(profile.index);
  const shareUrl = absoluteUrl(iljuPath(e.slug));
  // 같은 일간(천간)을 공유하는 다른 일주로 내부 링크 (토픽 클러스터).
  const related = ALL_ILJU.filter(
    (x) => x.ganIdx === e.ganIdx && x.slug !== e.slug,
  );

  const blocks = [
    { label: '성격 · 자존감', body: profile.ego, accent: 'text-navy' },
    { label: '연애 · 결혼', body: profile.love, accent: 'text-navy' },
    { label: '일 · 재물', body: profile.career, accent: 'text-navy' },
  ];

  return (
    <main className="min-h-dvh overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(iljuJsonLd(e)) }}
      />

      <section className="relative px-5 pb-8 pt-8">
        <div className="hanji-overlay" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            href="/ilju"
            className="inline-flex items-center gap-1 text-xs font-black text-muted"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            60갑자 일주 사전
          </Link>

          {/* 내 사주 캐릭터 카드 — 오행 테마 정체성 + 공유(바이럴 진입) */}
          <div
            className="mt-4 overflow-hidden rounded-[28px] border bg-white shadow-[0_18px_40px_rgba(44,62,80,0.10)]"
            style={{ borderColor: `${theme.accent}55` }}
          >
            <div className="grid md:grid-cols-[1fr_0.5fr]">
              <div className="p-6 md:p-8" style={{ background: theme.soft }}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="mint">60갑자 일주</Badge>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black text-white"
                    style={{ background: theme.accent }}
                  >
                    <span className="font-hanja">{theme.hanja}</span>
                    {theme.element}의 기운
                  </span>
                </div>
                <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-navy md:text-5xl">
                  {profile.name}일주
                  <span
                    className="ml-2 font-hanja text-2xl md:text-3xl"
                    style={{ color: theme.accent }}
                  >
                    {profile.hanja}日柱
                  </span>
                </h1>
                <p className="mt-2 text-sm font-black text-muted">
                  60갑자 중 {profile.index + 1}번째 · 일간 {e.gan}(
                  {theme.element})
                </p>
                <p className="mt-4 max-w-2xl text-base font-bold leading-relaxed text-[#6F665E]">
                  {profile.ego}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border bg-white/80 px-3 py-1.5 text-xs font-black text-navy"
                      style={{ borderColor: `${theme.accent}40` }}
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <ShareIljuButton
                    url={shareUrl}
                    name={profile.name}
                    accent={theme.accent}
                    slug={e.slug}
                  />
                  <Link
                    href="/preview"
                    className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-navy px-5 text-sm font-black text-white"
                  >
                    내 일주 무료로 확인
                  </Link>
                </div>
              </div>
              <div
                className="relative flex flex-col items-center justify-center gap-2 p-6"
                style={{ background: theme.accent }}
              >
                <span className="font-hanja text-[84px] font-black leading-none text-white md:text-[104px]">
                  {profile.hanja}
                </span>
                <KkobukSprite
                  variant="persona-dosa"
                  size="lg"
                  ariaLabel={`${profile.name}일주를 설명하는 꼬북도사`}
                  className="drop-shadow-[0_16px_28px_rgba(0,0,0,0.18)]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 일간 / 일지 한 줄 */}
      <section className="border-y border-navy/10 bg-white/72 px-5 py-8">
        <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2">
          <article className="rounded-3xl border border-navy/10 bg-white/90 p-5">
            <p className="text-xs font-black text-mint-dark">
              일간 · {e.gan} (나 자신)
            </p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-navy">
              {profile.ganNote}
            </p>
          </article>
          <article className="rounded-3xl border border-navy/10 bg-white/90 p-5">
            <p className="text-xs font-black text-[#7C5A0E]">
              일지 · {e.ji} (배우자궁)
            </p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-navy">
              {profile.jiNote}
            </p>
          </article>
        </div>
      </section>

      {/* 성격 / 연애 / 직업 */}
      <section className="px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-black text-navy">
            {profile.name}일주 한눈에 보기
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {blocks.map((b) => (
              <article
                key={b.label}
                className="rounded-3xl border border-navy/10 bg-white/90 p-5 shadow-[0_10px_24px_rgba(44,62,80,0.05)]"
              >
                <h3 className="text-base font-black text-navy">{b.label}</h3>
                <p className="mt-2 text-sm font-bold leading-relaxed text-muted">
                  {b.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <article className="rounded-3xl border border-mint/30 bg-mint/8 p-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} strokeWidth={2.5} className="text-mint-dark" />
                <h3 className="text-base font-black text-navy">강점</h3>
              </div>
              <ul className="mt-3 space-y-1.5">
                {profile.strengths.map((s) => (
                  <li key={s} className="text-sm font-bold text-navy">
                    ✓ {s}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-3xl border border-red/25 bg-red/8 p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} strokeWidth={2.5} className="text-red" />
                <h3 className="text-base font-black text-navy">조심할 점</h3>
              </div>
              <ul className="mt-3 space-y-1.5">
                {profile.watch.map((w) => (
                  <li key={w} className="text-sm font-bold text-navy">
                    ! {w}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-navy/10 px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-black text-navy">자주 묻는 질문</h2>
          <div className="mt-4 divide-y divide-navy/10 overflow-hidden rounded-3xl border border-navy/10 bg-white/90">
            {iljuFaqs(e).map((faq) => (
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
      </section>

      {/* 같은 일간 다른 일주 — 내부 링크 */}
      {related.length > 0 && (
        <section className="px-5 pb-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-lg font-black text-navy">
              {e.gan} 일간의 다른 일주
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={iljuPath(r.slug)}
                  className="rounded-full border border-navy/10 bg-white/85 px-4 py-2 text-sm font-black text-navy transition hover:border-mint/70"
                >
                  {r.profile.name}일주
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-navy px-5 py-10 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-mint-soft">꼬북점</p>
            <h2 className="mt-1 text-2xl font-black">
              내 일주, 진짜 {profile.name}일주가 맞을까요?
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/70">
              생년월일을 넣으면 1초 만에 내 일주와 사주팔자를 확인할 수 있어요.
            </p>
          </div>
          <Link
            href="/preview"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-navy"
          >
            무료로 내 일주 보기
            <ArrowRight size={16} strokeWidth={3} />
          </Link>
        </div>
      </section>

      {/* 비로그인 모바일 유입 전용 sticky 가입 CTA + 그만큼의 하단 여백 */}
      <div className="h-20" aria-hidden />
      <IljuSignupCta />
    </main>
  );
}
