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

## 라이브 DB 검증 — `pnpm db:verify` (2026-08-14 추가)

정적 테스트(`migration-security.test.ts`)는 **SQL 파일**만 본다. 파일이 옳아도
**라이브 DB 에 적용됐는지**는 알 수 없다. 그 간극을 `scripts/db.mjs` 가 메운다.

```bash
export SUPABASE_PAT='sbp_...'   # 계정 토큰. 쓰고 나면 Revoke
pnpm db:status     # 어떤 마이그레이션이 적용됐나 (드리프트 탐지)
pnpm db:verify     # 보안 불변식 14건을 라이브에서 실측
```

`db:verify` 가 검사하는 불변식 (2026-08-14 기준 **14/14 통과**):

| 항목 | 실패 시 의미 |
|---|---|
| users 광범위 UPDATE 차단 | 사용자가 REST 로 자기 잔액·관리자 권한 변경 |
| credit_balance / is_admin 수정 불가 | 재화 무단 발행 / 권한 상승 |
| nickname·push 는 수정 **가능** | 과도한 축소로 정상 기능이 깨졌는지 (역방향 확인) |
| usage_logs 변조 차단 | 무료 한도 무한 리셋 |
| interpretations / daily_fortunes 쓰기 차단 | 유료 결과 위조·페이월 우회 |
| users INSERT 차단 | 신규 행에 잔액을 실어 생성 |
| `open_bread` 인자 = `p_user_id` 하나 | 경제 파라미터 주입으로 임의 재화 발행 |
| `increment_chat_usage` KST + 호출자 검증 | 무료 한도 누수 / 타인 한도 소진 |
| 대표프로필 소유권 FK | 남의 프로필을 대표로 지정 |
| 대표프로필 백필 누락 없음 | 기존 사용자가 온보딩으로 튕김 |

> ⚠️ 여전히 남은 간극: **실제 공격 시뮬레이션**(authenticated JWT 로 REST 직접 호출)은
> 테스트 계정이 필요해 자동화하지 않았다. `db:verify` 는 grant/정책 상태를 보지만
> "정말 막히는가"를 요청으로 때려보지는 않는다. 스테이징이 생기면 통합 테스트로 추가한다.
