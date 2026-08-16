# STATUS — 마지막 갱신 2026-08-14

## 현재 상태

**Phase 0 완료 · Phase 1 진행 중 (대표프로필 완료, 원장 v2 미착수)**

### 마지막 성공 검증

```
pnpm run verify   →  typecheck 0 errors
                     vitest 5 files / 37 tests passed
                     build ✓ (108 static pages)
```
`pnpm lint` 는 **기존 에러가 남아 있다**(cordova 번들 산출물, `scripts/verify-daily.ts`,
`OfflineGuard`, `logger`). 이번 작업과 무관하며 별도 정리 대상.

### 🎉 라이브 실측으로 해소된 UNKNOWN

| 항목 | 결과 |
|---|---|
| **출시 전 블로커 #1 (service_role 폴백)** | ✅ **해소됨.** `POST /rest/v1/rpc/is_service_role` → `true`. PostgREST 가 service_role 을 정상 인식한다. `add_credits`·환불·admin client 가 정상 동작한다는 뜻 |
| 라이브 스키마 드리프트 | ✅ **mig 1~17 적용됨. 14(match_profiles)·18·20 미적용.** 그 외 드리프트 없음 |
| `users` 컬럼 | `credit_balance`·`is_admin`·`is_pro`·`signup_bonus_granted`·`ai_consent_at`·`attr_*`·`push_token` 존재. `bread_stamps`·`representative_profile_id`·`leaf_balance` 없음(=18·20 미적용) |

### Feature flag

| flag | 위치 | 기본값 |
|---|---|---|
| `BETA_FREE_MODE` | `lib/credits/server.ts` (server-only) | env 미설정 = OFF. 프로덕션 값 UNKNOWN |
| `FEATURE_JAMIDO_ENABLED` | 미구현 | Phase 1 잔여 |

---

## 🔴 사용자 승인 대기

| # | 항목 | 이유 |
|---|---|---|
| ~~A-1~~ | ~~migration 18·19·20·21 적용~~ | ✅ **2026-08-14 적용 완료** (Management API, 순서 18→20→21→19). 검증 전부 통과, 데이터 손실 0 |
| **A-7** 🔴 | **migration 22 (프로필 중복 정리) 적용** | **사용자 데이터 변경**이라 별도 승인 필요(§19). 중복 17행 soft delete + identity unique 전환. 유료 풀이 손실 0건 확인됨 |
| A-2 | **배포 순서 필수** | `callback/route.ts`(admin upsert) **코드 배포 → migration 19 적용**. 반대면 그 사이 신규 가입 실패 |
| ~~A-2~~ | ~~배포 순서~~ | ✅ 해소 — 코드 배포 후 마이그레이션 적용 완료 |
| ~~A-3~~ | ~~`/preview` 복구 여부~~ | ✅ **해소** — 2026-08-14 사용자 지시로 "비로그인 진입 없음" 확정 (`DECISIONS.md` D-7) |
| A-4 | 무료 채팅 5회 → 1일 1질문권 전환 | 기존 사용자 고지 + 데이터 마이그레이션 |
| A-5 | 가입 보너스 30알 조정 | 기존 사용자 약속 변경 |
| A-6 | App Store/Play 리스팅 **실제 반영** | `APP_STORE.md` 는 동기화 완료(D-8). **App Store Connect / Play Console 에 사람이 붙여넣어야** 한다. 스크린샷도 6장 재촬영 필요(기존 캡처는 삭제된 라우트를 담고 있어 재사용 불가) |

---

## Phase 1 진행 상황

| 항목 | 상태 |
|---|---|
| `src/domain` 골격 | 🟡 시작됨 — `domain/monthly/summary.ts`, `domain/persona/display.ts` |
| **대표프로필** | ✅ **완료** — migration 20 + `lib/profiles/resolve.ts` + `PATCH /api/me/representative-profile` + 테스트 9건 |
| 다중 '본인' 허용 | ✅ 완료 — `api/profiles` 의 409 제거, 중복은 identity_hash unique 로 방지 |
| `relation_type='self'` 가정 제거 | ✅ 완료 — 11개 호출부 전부 이관 (admin 통계 1곳만 의도적 잔존) |
| **서비스 카탈로그·에러코드·플래그** | ✅ **완료** — `domain/policy/catalog.ts`(가격 단일진실+POLICY_VERSION), `domain/errors.ts`(31개 코드), `lib/flags.ts`(server-only) |
| **`reports` / `report_jobs`** | 🟡 **DB·도메인 완료** — migration 21 + `report_transition()` CAS RPC + `domain/reports/state.ts` + SQL↔TS 동기화 테스트. **application use case·라우트 미착수** |
| **entitlements (무료권)** | 🟡 **DB·도메인 완료** — reserve/consume/release RPC + KST window 계산 + 경계 테스트 14건. **채팅/오늘운세 연결 미착수** |
| 꼬북잎 wallet v2 | 🟡 컬럼만 추가(`leaf_balance`, `paid_chat_turns`). 원장·교환 RPC 미착수 |
| CI 스크립트 | ✅ `typecheck`·`test`·`test:watch`·`verify` 추가 |
| **상용 수준 정리** | ✅ **완료** — 비로그인 미리보기/테스트로그인 제거, 없는 기능 마케팅 표면 전부 제거, 308 리다이렉트, robots·메타·스토어 리스팅 동기화 (D-7·D-8) |

---

## 다음 세션 재개 프롬프트 (그대로 붙여넣기)

```
GGOBUK 리빌드 이어서. repo: /Users/seungsoohan/Projects/GGOBUK/kkobukjeom
Phase 0 완료·배포됨(2b37d01). Phase 1 은 대표프로필·카탈로그·상태머신·무료권 DB 까지 완료.
`pnpm run verify` 통과 (84 tests). docs/parity-rebuild/{BASELINE,DECISIONS,STATUS,MASTER_PLAN}.md 먼저 읽어라.
migration 18·19·20·21 은 작성만 됐고 프로덕션 미적용(승인 A-1). 라이브는 mig 1~17만 적용.
코드는 마이그레이션 전에도 동작하도록 컬럼 부재 폴백이 들어가 있다 — 지우지 마라.
다음: Phase 1 마무리 — (1) src/application/reports/ use case(preview→purchase→job→result→refund),
(2) 기존 full_saju 를 reports 파이프라인 adapter 로 이관, (3) 꼬북잎 원장 + 1알↔3잎 교환 RPC(migration 22).
먼저 손댈 파일: src/application/reports/generate.ts(신규), src/app/api/reports/route.ts(신규),
supabase/migrations/…22_wallet_leaf.sql(신규)
```
