import type { Metadata } from "next";
import { PreviewEntryClient } from "@/components/preview/PreviewEntryClient";
import { SITE_NAME, absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "무료 사주 미리보기",
  description:
    "로그인 없이 생년월일과 태어난 시간을 입력해 사주팔자, 오행, 일주, 대운의 기본 구조를 미리 확인해보세요.",
  alternates: { canonical: absoluteUrl("/preview") },
  keywords: ["무료 사주", "사주 미리보기", "사주팔자", "오행", "대운"],
  openGraph: {
    title: `무료 사주 미리보기 - ${SITE_NAME}`,
    description:
      "로그인 없이 사주팔자와 오행 구조를 미리 확인할 수 있는 꼬북점 사주 미리보기입니다.",
    url: absoluteUrl("/preview"),
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
};

export default function PreviewEntryPage() {
  return <PreviewEntryClient />;
}
