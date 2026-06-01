import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME, absoluteUrl } from '@/lib/seo/site';
import { inviteHostName } from '@/lib/relations/invite_host';

/**
 * 초대 페이지(/invite/[token])는 'use client' 라 자체적으로 metadata 를 못 내보낸다.
 * 이 서버 layout 이 generateMetadata 로 카카오톡·트위터 미리보기(OG)를 채운다.
 * 토큰 URL 은 사적이므로 robots:index=false (언퍼러는 robots 를 무시하니 미리보기는 정상).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const hostName = await inviteHostName(token);
  const who = hostName ?? '친구';
  // 브랜드 접미사는 부모 레이아웃의 title.template(`%s | 꼬북점`)이 붙이므로 생략한다.
  const title = `${who}님이 너와의 궁합을 궁금해해요`;
  const description = `생년월일만 넣으면 1초 만에 ${who}님과의 사주 궁합 점수가 나와요. 가입 없이 바로 확인!`;
  const ogUrl = absoluteUrl(`/api/og/invite/${token}`);

  return {
    title,
    description,
    // 사적 초대 링크 — 검색 색인 금지(미리보기 언퍼링은 robots 와 무관하게 동작).
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
      images: [
        {
          url: ogUrl,
          // 실제 출력은 2x 슈퍼샘플(2400×1260, 1.91:1 동일) — 꼬북이 또렷하게.
          width: 2400,
          height: 1260,
          alt: `${who}님과의 궁합 · ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function InviteLayout({ children }: { children: ReactNode }) {
  return children;
}
