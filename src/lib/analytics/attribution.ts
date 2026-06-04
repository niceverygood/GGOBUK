// 광고 유입 어트리뷰션 — first-touch 모델.
//
// 미들웨어에서 utm_*/fbclid 가 처음 보일 때 쿠키(kj_attr)에 한 번 굳혀두고,
// 가입 시점(callback)에 users.attr_* 컬럼으로 복사한다. anon_id(kj_anon)는
// 로그인 전 익명 방문자를 page_view 이벤트와 stitch 하기 위한 식별자다.
//
// edge(미들웨어)·node(API) 양쪽에서 동작해야 하므로 next/headers 같은 런타임
// 종속 모듈을 import 하지 않는다 — 순수 직렬화/파싱 헬퍼만 둔다.

export const ATTR_COOKIE = 'kj_attr';
export const ANON_COOKIE = 'kj_anon';

/** first-touch 쿠키 수명. 광고 클릭 후 한참 뒤 가입하는 케이스를 위해 넉넉히. */
export const ATTR_MAX_AGE_SEC = 90 * 24 * 60 * 60; // 90일
export const ANON_MAX_AGE_SEC = 180 * 24 * 60 * 60; // 180일

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  fbclid?: string;
  /** 광고 클릭이 떨어진 첫 경로. */
  landing?: string;
  /** document.referrer (있으면). */
  referrer?: string;
  /** ISO. 첫 터치 시각. */
  ts?: string;
}

/** 빈 문자열/너무 긴 값 방어. */
function clean(v: string | null | undefined, max = 200): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * URL 쿼리스트링에서 어트리뷰션을 추출한다. utm_* 또는 fbclid 가 하나도
 * 없으면 null (→ 쿠키를 만들지 않음, 직접 유입으로 간주).
 */
export function parseAttributionFromQuery(
  params: URLSearchParams,
  landingPath?: string,
  referrer?: string,
): Attribution | null {
  const source = clean(params.get('utm_source'));
  const medium = clean(params.get('utm_medium'));
  const campaign = clean(params.get('utm_campaign'));
  const content = clean(params.get('utm_content'));
  const term = clean(params.get('utm_term'));
  const fbclid = clean(params.get('fbclid'));

  // fbclid 만 있고 utm 이 없으면 페이스북 유입으로 소스를 보정한다.
  const hasAny = source || medium || campaign || content || term || fbclid;
  if (!hasAny) return null;

  return {
    source: source ?? (fbclid ? 'facebook' : undefined),
    medium: medium ?? (fbclid ? 'paid' : undefined),
    campaign,
    content,
    term,
    fbclid,
    landing: clean(landingPath, 300),
    referrer: clean(referrer, 300),
    ts: new Date().toISOString(),
  };
}

/** 쿠키 값으로 직렬화 (URL-encoded JSON). */
export function serializeAttribution(attr: Attribution): string {
  return encodeURIComponent(JSON.stringify(attr));
}

/** 쿠키 값에서 역직렬화. 깨진 값은 null. */
export function deserializeAttribution(
  raw: string | undefined | null,
): Attribution | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    if (obj && typeof obj === 'object') return obj as Attribution;
    return null;
  } catch {
    return null;
  }
}

/** anon_id 생성 — crypto.randomUUID 는 edge/node 22 양쪽에서 사용 가능. */
export function newAnonId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * 페이스북 클릭ID(fbclid) → `_fbc` 쿠키 포맷으로 변환.
 * Conversions API 매칭 품질을 위해 사용. 형식: fb.1.<unixMs>.<fbclid>
 */
export function fbcFromFbclid(fbclid: string | undefined, ts?: string): string | undefined {
  if (!fbclid) return undefined;
  const ms = ts ? Date.parse(ts) : Date.now();
  return `fb.1.${Number.isNaN(ms) ? Date.now() : ms}.${fbclid}`;
}
