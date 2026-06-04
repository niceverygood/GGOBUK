// 서버측 이벤트 기록 — analytics_events 에 append.
//
// analytics_events 는 RLS 가 켜져 있고 정책이 없으므로 service_role 로만 기록할
// 수 있다. 모든 기록은 best-effort(실패해도 호출자 흐름을 깨지 않음) 다.

import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import {
  ANON_COOKIE,
  ATTR_COOKIE,
  deserializeAttribution,
  type Attribution,
} from './attribution';

/** 기록 가능한 이벤트 이름 화이트리스트 — 오염/스팸 방지. */
export const TRACKABLE_EVENTS = [
  'page_view',
  'login_cta_click', // 로그인 버튼 탭 (카카오/애플)
  'onboarding_start', // 사주 입력 화면 진입
  'onboarding_complete', // 본인 사주 프로필 생성
  'signup', // 신규 가입 완료(서버)
  'activation_chat', // 첫 채팅 전송
  'view_pricing', // 꼬북알 충전 화면
  'checkout_start', // 결제 시작(카카오페이 ready)
  'purchase', // 결제 완료(서버)
  'share_click', // 공유 버튼 탭
] as const;

export type TrackableEvent = (typeof TRACKABLE_EVENTS)[number];

export function isTrackableEvent(name: string): name is TrackableEvent {
  return (TRACKABLE_EVENTS as readonly string[]).includes(name);
}

/** 요청 쿠키에서 anon_id + first-touch 어트리뷰션을 읽는다 (서버 컴포넌트/라우트). */
export async function readTrackingContext(): Promise<{
  anonId: string | null;
  attribution: Attribution | null;
}> {
  try {
    const store = await cookies();
    const anonId = store.get(ANON_COOKIE)?.value ?? null;
    const attribution = deserializeAttribution(store.get(ATTR_COOKIE)?.value);
    return { anonId, attribution };
  } catch {
    return { anonId: null, attribution: null };
  }
}

export interface RecordEventParams {
  event: TrackableEvent;
  userId?: string | null;
  anonId?: string | null;
  attribution?: Attribution | null;
  path?: string | null;
  valueKrw?: number | null;
  props?: Record<string, unknown>;
  userAgent?: string | null;
  /** 재사용할 service-role 클라이언트(없으면 내부에서 생성). */
  admin?: SupabaseClient;
}

/**
 * analytics_events 한 줄 기록. 절대 throw 하지 않는다.
 * attribution 이 주어지지 않으면 요청 쿠키에서 자동으로 읽어 채운다.
 */
export async function recordEvent(params: RecordEventParams): Promise<void> {
  try {
    const admin =
      params.admin ?? (await createServerClient({ admin: true }));

    let { anonId, attribution } = params;
    if (anonId === undefined || attribution === undefined) {
      const ctx = await readTrackingContext();
      anonId = anonId ?? ctx.anonId;
      attribution = attribution ?? ctx.attribution;
    }

    let userAgent = params.userAgent;
    if (userAgent === undefined) {
      try {
        userAgent = (await headers()).get('user-agent');
      } catch {
        userAgent = null;
      }
    }

    const a = attribution ?? undefined;
    const { error } = await admin.from('analytics_events').insert({
      event_name: params.event,
      user_id: params.userId ?? null,
      anon_id: anonId ?? null,
      utm_source: a?.source ?? null,
      utm_medium: a?.medium ?? null,
      utm_campaign: a?.campaign ?? null,
      utm_content: a?.content ?? null,
      utm_term: a?.term ?? null,
      fbclid: a?.fbclid ?? null,
      landing_path: a?.landing ?? null,
      referrer: a?.referrer ?? null,
      path: params.path ?? a?.landing ?? null,
      value_krw: params.valueKrw ?? null,
      props: params.props ?? {},
      user_agent: userAgent ?? null,
    });
    if (error) {
      // 테이블 미적용(마이그레이션 17 전)·권한 등은 경고만. 흐름은 유지.
      logger.warn('analytics', 'recordEvent insert failed', {
        event: params.event,
        code: error.code,
        message: error.message,
      });
    }
  } catch (e) {
    logger.warn('analytics', 'recordEvent threw (non-fatal)', {
      event: params.event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
