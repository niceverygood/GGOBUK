# QA_MATRIX

## 자동화됨 (Phase 0, `vitest run` 28건)

| 영역 | 파일 | 건수 |
|---|---|---|
| 사주 계산 회귀 | `src/lib/saju/__tests__/palja.test.ts` | 6 |
| 카카오 provider 판별 | `src/lib/auth/__tests__/provider.test.ts` | 3 |
| **마이그레이션 권한 불변식** | `src/lib/db/__tests__/migration-security.test.ts` | 12 |
| **OAuth open-redirect** | `src/lib/auth/__tests__/safe-next.test.ts` | 7 |

## 미자동화 — Phase 별 추가 필요

| 영역 | 케이스 | Phase |
|---|---|---|
| 사주 계산 | 입춘 전후 연주, 절기 경계 월주, 23:30 야자시, 시간모름, 음력/윤달, 1900/2100 경계 | 1 |
| 프로필 | 0/1/N 대표 선택, 다중 '본인', 타 사용자 profileId 거부, 대표 삭제·복원, 동시 중복 생성 | 1~2 |
| 원장 | 잔액부족/정확잔액/동시 2구매, 동일 idempotency 재시도, 1알↔3잎 보존법칙, 무료권 우선소모, KST 22:59/23:00·23:59/00:00 경계, AI 실패 시 **정확히 한 번** 환불 | 6 |
| 선물·쿠폰 | 1/10/0/11/소수/음수, self-claim 거부, claim↔cancel 동시요청, 종료상태 멱등, brute-force RL, raw code 미로깅 | 6 |
| 보안 | 전 mutation unauthenticated/IDOR, **RLS 직접 REST 공격**, share token 추측·revoke, XSS, 업로드 MIME, 결제 body 변조, webhook 미설정 fail-closed | 각 Phase |
| UI/E2E | 320/375/390/428/448/1024px, iOS safe-area, Android back, keyboard-open chat, 200% 확대, focus trap, 44px 타깃, slow3G/offline, 생성중 새로고침, bottom nav 가림 | 2~7 |

## 🔴 지금 자동화할 수 없는 것
**RLS 실제 공격 검증**(anon/authenticated REST 로 `credit_balance` 직접 UPDATE 시도)은 스테이징 DB 가 필요하다.
Phase 0 의 마이그레이션 테스트는 **정적 SQL 검사**이며, 라이브 grant 상태를 보장하지 않는다.
→ migration 19 preflight SQL 로 사람이 확인해야 한다.
