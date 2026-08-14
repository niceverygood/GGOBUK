import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

/**
 * 색인 정책.
 *
 * allow  = 공개 마케팅 표면(실제로 존재하고 비로그인 200 인 것만).
 * disallow = 로그인 뒤 앱 화면, 인증 콜백, API, 관리자.
 *
 * ⚠️ 제거된 기능 경로(/gunghap·/daewoon·/taegil·/preview·/relations 등)는 여기 적지 않는다.
 *    next.config.ts 의 308 리다이렉트가 흡수하므로 크롤러에게 알릴 필요가 없다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/saju", "/today-fortune", "/ilju"],
        disallow: [
          "/api/",
          "/admin",
          "/callback",
          "/login",
          "/splash",
          "/onboarding",
          "/home",
          "/shell",
          "/chat",
          "/more",
          "/store",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
