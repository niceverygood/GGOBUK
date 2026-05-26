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
