import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Card } from '@/components/ui/primitives';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { SITE_NAME, absoluteUrl } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

interface ShareData {
  token: string;
  kind: 'interpretation' | 'overview';
  category: string | null;
  persona: PersonaKey | null;
  title: string | null;
  ownerName: string | null;
  content: string;
  palja: Record<string, unknown> | null;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
}

/** RLS 우회해서 share 데이터 가져오기. expired 또는 not_found는 null. */
async function fetchShare(token: string): Promise<ShareData | null> {
  const admin = await createServerClient({ admin: true });
  const { data } = await admin
    .from('saju_shares')
    .select(
      'token, kind, category, persona, title, owner_name, content_snapshot, palja_snapshot, view_count, created_at, expires_at',
    )
    .eq('token', token)
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  // fire-and-forget view count
  void admin
    .from('saju_shares')
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq('token', token);
  return {
    token: data.token,
    kind: data.kind,
    category: data.category,
    persona: data.persona as PersonaKey | null,
    title: data.title,
    ownerName: data.owner_name,
    content: data.content_snapshot,
    palja: data.palja_snapshot,
    viewCount: (data.view_count ?? 0) + 1,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

/** OG / Twitter meta — 카카오톡·Twitter·iMessage 미리보기 위해. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const share = await fetchShare(token);
  if (!share) {
    return {
      title: '만료된 공유 링크',
      robots: 'noindex',
    };
  }
  const headerStore = await headers();
  const proto = headerStore.get('x-forwarded-proto') ?? 'https';
  const host = headerStore.get('host') ?? '';
  const url = `${proto}://${host}/share/${token}`;
  const personaName = share.persona ? PERSONAS[share.persona]?.displayName ?? '꼬북도사' : '꼬북도사';
  const ogTitle = `${share.ownerName ?? '익명'} 님의 ${share.title ?? '사주 풀이'} · ${SITE_NAME}`;
  const ogDesc = `${personaName} 모드로 본 사주 풀이. 비교 사주는 꼬북점에서.`;
  return {
    title: ogTitle,
    description: ogDesc,
    robots: 'noindex,nofollow', // 공유 링크는 검색엔진 노출 X
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      url,
      siteName: SITE_NAME,
      type: 'article',
      locale: 'ko_KR',
      images: [{ url: absoluteUrl('/icons/icon-512.png'), width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
    },
  };
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  const share = await fetchShare(token);
  if (!share) {
    return (
      <main className="min-h-dvh bg-[#FDFAF3] px-6 py-20 max-w-lg mx-auto text-center">
        <KkobukAvatar variant="dosa" size="lg" />
        <h1 className="mt-6 text-2xl font-black text-navy">
          만료된 공유 링크예요
        </h1>
        <p className="mt-2 text-sm font-bold text-[#82786D] leading-relaxed">
          공유 링크는 30일간 유지돼요.
          <br />이 링크는 만료됐거나 잘못된 토큰이에요.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white"
        >
          꼬북점에서 내 사주 보기 →
        </Link>
      </main>
    );
  }

  const personaName = share.persona
    ? PERSONAS[share.persona]?.displayName ?? '꼬북도사'
    : '꼬북도사';

  return (
    <main className="min-h-dvh bg-[#FDFAF3] pb-24">
      <div className="hanji-overlay fixed inset-0 pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-5 pt-10">
        {/* 친구가 보는 share — 헤더 */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-mint/40 px-3 py-1 text-[11px] font-extrabold text-mint-dark">
            ✨ 친구가 공유한 사주 풀이
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-navy">
            {share.ownerName ?? '익명'} 님의 {share.title ?? '사주'}
          </h1>
          <p className="mt-1 text-xs font-bold text-[#82786D]">
            {personaName} 모드 · 조회 {share.viewCount.toLocaleString('ko-KR')}회
          </p>
        </div>

        {/* 풀이 본문 */}
        <Card className="mt-6 p-5 bg-white">
          <InterpretationBody text={share.content} />
        </Card>

        {/* CTA — 본인 사주도 보러 가기 */}
        <Card className="mt-5 p-5 bg-gradient-to-br from-mint/14 via-white to-gold/12 border border-mint/40">
          <div className="flex items-center gap-3">
            <KkobukAvatar variant="dosa" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-mint-dark">
                내 사주는 어떨까?
              </p>
              <p className="mt-0.5 text-base font-black text-navy leading-snug">
                꼬북점에서 무료로 받아보세요
              </p>
              <p className="mt-1 text-[11px] font-bold text-[#82786D]">
                가입 즉시 30 꼬북알 보너스 → 정밀 풀이 10개 받기
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-3 block w-full rounded-2xl bg-navy py-3 text-center text-sm font-black text-white"
          >
            꼬북점 시작하기 →
          </Link>
        </Card>

        <p className="mt-6 text-center text-[10px] font-bold text-[#82786D]">
          {SITE_NAME} · 공유 링크는 30일간 유효합니다
        </p>
      </div>
    </main>
  );
}
