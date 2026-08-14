import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  /**
   * 제거된 경로의 308 영구 리다이렉트.
   *
   * v2 대단순화로 궁합·대운·택일 기능이 사라졌고, 비로그인 미리보기도 없앴다.
   * 색인·외부 링크·앱 리뷰어가 404 를 만나지 않도록 흡수한다.
   * (404 를 남기면 SEO 손실 + App Review 2.3 지적 소지)
   */
  async redirects() {
    return [
      { source: '/gunghap', destination: '/', permanent: true },
      { source: '/daewoon', destination: '/', permanent: true },
      { source: '/taegil', destination: '/', permanent: true },
      { source: '/preview', destination: '/login', permanent: true },
      { source: '/preview/:path*', destination: '/login', permanent: true },
      // v2 에서 제거된 앱 라우트
      { source: '/relations/:path*', destination: '/home', permanent: true },
      { source: '/timeline', destination: '/home', permanent: true },
      { source: '/library', destination: '/home', permanent: true },
      { source: '/calendar', destination: '/home', permanent: true },
      { source: '/persona/:path*', destination: '/home', permanent: true },
      { source: '/mode', destination: '/home', permanent: true },
      { source: '/more/pro', destination: '/store', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 카카오 OAuth + Vercel preview overlay (vercel.live) 허용.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.kakaocdn.net https://kauth.kakao.com https://vercel.live",
              // style-src-elem 명시 — Google Fonts 외부 CSS 허용.
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://k.kakaocdn.net https://vercel.live https://vercel.com",
              // Google Fonts 실제 폰트 파일 + Vercel preview 폰트 허용.
              "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://kauth.kakao.com https://kapi.kakao.com https://api.anthropic.com https://openrouter.ai https://api.openai.com https://fcm.googleapis.com https://vercel.live wss://ws-us3.pusher.com",
              "frame-src 'self' https://kauth.kakao.com https://online-pay.kakao.com https://vercel.live",
              "form-action 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
