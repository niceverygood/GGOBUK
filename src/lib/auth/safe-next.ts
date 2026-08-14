/**
 * OAuth `next` 파라미터의 open-redirect 방어.
 *
 * ⚠️ 문자열 접두사 검사(startsWith('/') && !startsWith('//'))로는 부족하다.
 * WHATWG URL 파서가 백슬래시를 슬래시로 정규화하고 제어문자를 제거하기 때문에
 * 다음이 전부 외부 도메인으로 빠져나간다 (실측):
 *   new URL('/\\evil.com',  base) → https://evil.com/
 *   new URL('/\tevil.com',  base) → https://evil.com/
 *
 * 따라서 **실제 리다이렉트에 쓰는 파서와 동일한 파서로 해석한 뒤 origin 을 대조**한다.
 */
const SENTINEL_ORIGIN = 'https://ggobuk.invalid';

export function safeNext(path: string | null | undefined): string {
  if (!path) return '/home';
  try {
    const parsed = new URL(path, SENTINEL_ORIGIN);
    // 다른 origin 으로 해석되면 절대 URL 이거나 우회 페이로드다.
    if (parsed.origin !== SENTINEL_ORIGIN) return '/home';
    // 정규화된 내부 경로만 재조립한다 (원문을 그대로 신뢰하지 않는다).
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/home';
  }
}
