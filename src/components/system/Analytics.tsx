'use client';

// 전역 분석 마운트 — 루트 레이아웃에 1회 배치.
//  · 라우트 변경마다 page_view 이벤트(+ Facebook Pixel PageView) 발사.
//  · NEXT_PUBLIC_FB_PIXEL_ID 가 있을 때만 Facebook Pixel 베이스 스크립트 로드.
//
// 픽셀이 없어도(개발/미설정) page_view 는 자체 /api/track 으로 계속 수집된다.

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { track, fbqTrack } from '@/lib/analytics/track';

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export function Analytics() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    track('page_view', undefined, pathname);
    fbqTrack('PageView');
  }, [pathname]);

  if (!PIXEL_ID) return null;

  // 베이스 스니펫에서 PageView 자동 발사는 빼고(위 effect 가 첫 로드 포함 담당)
  // 중복 PageView 를 방지한다.
  return (
    <Script id="fb-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');`}
    </Script>
  );
}
