import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/saju",
          "/gunghap",
          "/today-fortune",
          "/daewoon",
          "/taegil",
          "/preview",
        ],
        disallow: [
          "/api/",
          "/callback",
          "/login",
          "/splash",
          "/home",
          "/shell",
          "/chat",
          "/relations",
          "/timeline",
          "/library",
          "/more",
          "/onboarding",
          "/persona",
          "/preview/result",
          "/sprite-test",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
