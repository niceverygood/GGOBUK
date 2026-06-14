// 공유 링크에 first-touch UTM을 부착한다.
//
// middleware가 진입 시 utm_*를 읽어 kj_attr 쿠키(first-touch)로 굳히므로, 공유
// URL에 utm만 달아두면 share→signup→purchase 귀속이 자동으로 이어진다.
//
// ⚠️ 규칙:
//  - /api/og/* (OG 이미지) URL에는 절대 붙이지 말 것 — 쿼리가 바뀌면 카카오톡 등의
//    OG 캐시 키가 흔들려 미리보기 캐시가 깨진다. 호출부는 "사람이 여는 본문 URL"만 넘긴다.
//  - 이미 utm_source가 있으면 그대로 보존(중복/덮어쓰기 방지).

export interface ShareUtm {
  /** 캠페인 — 공유물 종류 (ilju | interp | compat ...) */
  campaign: string;
  /** 콘텐츠 식별자 — slug나 category 등 (선택) */
  content?: string;
}

export function withShareUtm(url: string, opts: ShareUtm): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has('utm_source')) return url;
    u.searchParams.set('utm_source', 'share');
    u.searchParams.set('utm_medium', 'viral');
    u.searchParams.set('utm_campaign', opts.campaign);
    if (opts.content) u.searchParams.set('utm_content', opts.content);
    return u.toString();
  } catch {
    // 상대경로 등 파싱 불가 시 원본 그대로(귀속만 포기, 흐름은 유지).
    return url;
  }
}
