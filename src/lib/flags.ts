import 'server-only';
import { FLAG_DEFAULTS, type FeatureFlag } from '@/domain/policy/catalog';

/**
 * feature flag 해석 — **서버 전용**.
 *
 * 명세 §4.2: "비용·권한 판단은 클라이언트 공개 환경변수 하나에 의존하지 않는다."
 * 그래서 `NEXT_PUBLIC_` 접두 변수를 읽지 않는다. 클라이언트가 어떤 기능을 볼지는
 * 서버 컴포넌트가 이 값을 읽어 props 로 내려주거나 라우트가 404 를 내는 방식으로 정한다.
 *
 * env 이름 규칙: 플래그명 그대로. 예) `FEATURE_COMPATIBILITY=true`
 * 미설정이면 `FLAG_DEFAULTS`(전부 false)를 따른다 — fail-closed.
 */
export function isEnabled(flag: FeatureFlag): boolean {
  const raw = process.env[flag];
  if (raw === undefined || raw === '') return FLAG_DEFAULTS[flag];
  return raw.trim().toLowerCase() === 'true';
}

/** 현재 켜져 있는 플래그 목록 (관리자 화면·진단용). */
export function enabledFlags(): FeatureFlag[] {
  return (Object.keys(FLAG_DEFAULTS) as FeatureFlag[]).filter(isEnabled);
}
