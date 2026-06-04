// 클라이언트 이벤트 전송 헬퍼.
//
// sendBeacon 으로 보내 페이지 이탈 중에도 유실되지 않게 한다(결제 리다이렉트 등).
// 서버(/api/track)가 쿠키에서 anon_id·어트리뷰션을 붙이므로 여기선 이벤트명만.

import type { TrackableEvent } from './events';

export function track(
  event: TrackableEvent,
  props?: Record<string, unknown>,
  path?: string,
): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    event,
    props,
    path: path ?? window.location.pathname,
  });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/track',
        new Blob([body], { type: 'application/json' }),
      );
      return;
    }
  } catch {
    // sendBeacon 실패 → fetch 폴백.
  }
  void fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * 브라우저 Facebook Pixel 표준 이벤트. 픽셀이 없으면 no-op.
 * eventId 를 주면 서버 CAPI 와 자동 중복 제거된다.
 */
export function fbqTrack(
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (eventId) window.fbq('track', event, params ?? {}, { eventID: eventId });
  else window.fbq('track', event, params ?? {});
}
