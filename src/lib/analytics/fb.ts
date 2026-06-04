// Facebook(Meta) Conversions API — 서버측 전환 신호.
//
// 왜 서버측인가: iOS 14.5+ ATT·광고 차단으로 브라우저 픽셀의 가입/결제 이벤트가
// 30~60% 유실된다. CAPI 로 서버에서 한 번 더 보내면 Meta 가 광고를 제대로
// 최적화한다. 브라우저 픽셀과 같은 event_id 를 쓰면 자동 중복 제거된다.
//
// 전부 env-gated: FB_PIXEL_ID + FB_CAPI_ACCESS_TOKEN 이 없으면 조용히 no-op.
// PII(이메일/외부ID)는 Meta 요구대로 SHA-256(소문자·trim) 해시 후 전송한다.

import { createHash } from 'crypto';
import { logger } from '@/lib/utils/logger';
import { fbcFromFbclid } from './attribution';

const GRAPH_VERSION = 'v21.0';

function pixelId(): string | undefined {
  return (
    process.env.FB_PIXEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_FB_PIXEL_ID?.trim() ||
    undefined
  );
}

function accessToken(): string | undefined {
  return process.env.FB_CAPI_ACCESS_TOKEN?.trim() || undefined;
}

/** 둘 다 설정돼야 전송한다. */
export function isFbCapiConfigured(): boolean {
  return Boolean(pixelId() && accessToken());
}

/** 요청 Cookie 헤더에서 Facebook Pixel 의 _fbp/_fbc 를 추출(매칭 품질용). */
export function parseFbCookies(cookieHeader: string | null | undefined): {
  fbp?: string;
  fbc?: string;
} {
  if (!cookieHeader) return {};
  const fbp = /(?:^|;\s*)_fbp=([^;]+)/.exec(cookieHeader)?.[1];
  const fbc = /(?:^|;\s*)_fbc=([^;]+)/.exec(cookieHeader)?.[1];
  return {
    fbp: fbp ? decodeURIComponent(fbp) : undefined,
    fbc: fbc ? decodeURIComponent(fbc) : undefined,
  };
}

function sha256(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const norm = value.trim().toLowerCase();
  if (!norm) return undefined;
  return createHash('sha256').update(norm).digest('hex');
}

export type FbStandardEvent =
  | 'PageView'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Lead'
  | 'ViewContent';

export interface FbUserData {
  email?: string | null;
  /** 보통 로그인 사용자 ID. 해시 후 external_id 로 전송. */
  externalId?: string | null;
  /** _fbc 쿠키 또는 fbclid (없으면 fbclid 에서 생성). */
  fbc?: string | null;
  fbclid?: string | null;
  /** _fbp 쿠키. */
  fbp?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}

export interface SendFbCapiParams {
  eventName: FbStandardEvent;
  /** 브라우저 픽셀과 dedup 하기 위한 안정적 ID (예: purchase.id, user.id). */
  eventId: string;
  eventSourceUrl?: string | null;
  user: FbUserData;
  /** 결제 등 — value/currency/contents. */
  custom?: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentIds?: string[];
    numItems?: number;
  };
  eventTimeMs?: number;
}

/**
 * Conversions API 로 이벤트 1건 전송. 절대 throw 하지 않는다(best-effort).
 * env 미설정 시 즉시 no-op.
 */
export async function sendFbCapiEvent(params: SendFbCapiParams): Promise<void> {
  const id = pixelId();
  const token = accessToken();
  if (!id || !token) return;

  try {
    const u = params.user;
    const userData: Record<string, unknown> = {};
    const em = sha256(u.email);
    const ext = sha256(u.externalId);
    if (em) userData.em = [em];
    if (ext) userData.external_id = [ext];
    const fbc = u.fbc || fbcFromFbclid(u.fbclid ?? undefined);
    if (fbc) userData.fbc = fbc;
    if (u.fbp) userData.fbp = u.fbp;
    if (u.clientIpAddress) userData.client_ip_address = u.clientIpAddress;
    if (u.clientUserAgent) userData.client_user_agent = u.clientUserAgent;

    const customData: Record<string, unknown> = {};
    if (params.custom) {
      const c = params.custom;
      if (typeof c.value === 'number') customData.value = c.value;
      if (c.currency) customData.currency = c.currency;
      if (c.contentName) customData.content_name = c.contentName;
      if (c.contentIds) customData.content_ids = c.contentIds;
      if (typeof c.numItems === 'number') customData.num_items = c.numItems;
    }

    const event = {
      event_name: params.eventName,
      event_time: Math.floor((params.eventTimeMs ?? Date.now()) / 1000),
      event_id: params.eventId,
      action_source: 'website',
      event_source_url: params.eventSourceUrl ?? undefined,
      user_data: userData,
      custom_data: Object.keys(customData).length ? customData : undefined,
    };

    const body: Record<string, unknown> = { data: [event] };
    const testCode = process.env.FB_TEST_EVENT_CODE?.trim();
    if (testCode) body.test_event_code = testCode;

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${id}/events?access_token=${encodeURIComponent(
      token,
    )}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('fb-capi', 'event rejected', {
        event: params.eventName,
        status: res.status,
        body: text.slice(0, 300),
      });
    }
  } catch (e) {
    logger.warn('fb-capi', 'send threw (non-fatal)', {
      event: params.eventName,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
