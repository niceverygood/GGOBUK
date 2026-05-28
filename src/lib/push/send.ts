import webpush from 'web-push';
import { logger } from '@/lib/utils/logger';

/**
 * Web Push (VAPID) 발송 모듈.
 *
 * 환경변수:
 *  - VAPID_PUBLIC_KEY  (NEXT_PUBLIC_VAPID_PUBLIC_KEY 와 동일 값. 클라이언트 구독용)
 *  - VAPID_PRIVATE_KEY (서버 전용, 절대 노출 금지)
 *  - VAPID_SUBJECT     (mailto: 또는 https: — 기본 mailto:dev@bottlecorp.kr)
 *
 * subscription 은 클라이언트 PushManager.subscribe() 결과 JSON 을
 * users.push_token 에 JSON.stringify 해 저장한 것.
 */

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // 클릭 시 열 경로 (기본 /home)
  tag?: string; // 같은 tag 알림은 덮어씀
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) {
    return false;
  }
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:dev@bottlecorp.kr';
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** push_token(text)에 저장된 JSON 문자열을 subscription 객체로 파싱. */
export function parseSubscription(raw: string | null): StoredSubscription | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSubscription;
    if (parsed?.endpoint && parsed?.keys?.p256dh && parsed?.keys?.auth) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export interface SendResult {
  ok: boolean;
  /** 구독이 만료/무효(404/410)라 DB에서 제거해야 하는 경우 true */
  expired: boolean;
  error?: string;
}

/**
 * 단건 발송. 구독이 만료되면 expired=true 로 알려 호출자가 DB 정리하게 함.
 */
export async function sendPush(
  rawSubscription: string | null,
  payload: PushPayload,
): Promise<SendResult> {
  if (!ensureConfigured()) {
    return { ok: false, expired: false, error: 'vapid_not_configured' };
  }
  const sub = parseSubscription(rawSubscription);
  if (!sub) {
    return { ok: false, expired: true, error: 'invalid_subscription' };
  }
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? '/home',
        tag: payload.tag ?? 'ggobuk-daily',
      }),
    );
    return { ok: true, expired: false };
  } catch (e) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    // 404/410 = 구독 만료/해지 → 정리 대상
    const expired = statusCode === 404 || statusCode === 410;
    if (!expired) {
      logger.error('push', 'sendNotification failed', {
        statusCode,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return {
      ok: false,
      expired,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
