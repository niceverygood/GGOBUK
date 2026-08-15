# DECISIONS — 리빌드 중 내린 판단과 근거

우선순위 규칙은 마스터 프롬프트 §2.4를 따른다.

---

## D-1. 사용자의 "카카오 전용 축소" 작업과 명세 §12(추가 로그인)의 충돌 — 보류

**상황**: worktree 에서 사용자가 `lib/auth/provider.ts`(카카오 전용 판별)를 추가하고,
`capacitor.config.ts` 의 allowNavigation 에서 Apple 도메인을 제거했으며,
`/preview` 비로그인 퍼널과 `api/test/bootstrap` 익명 로그인을 제거했다.

명세 §12 는 이메일/Google/Naver adapter 설계와 iOS Sign in with Apple 검토를 요구하고,
§6.2 는 비로그인 상품 진입 후 `/login?next=` 복귀를 요구한다.

**판단**: **사용자 작업을 되돌리지 않는다.** §2.4 우선순위상 "이 프롬프트의 새 제품 결정"(4순위)이
"현재 배포 코드"(6순위)보다 높지만, 사용자의 **진행 중 의도**는 프롬프트가 작성된 시점 이후의
최신 신호일 수 있다. 되돌리는 것은 §2.1 위반이다.

**조치**: 추가 로그인은 **adapter 인터페이스만** 두고 자격증명 없이는 버튼을 노출하지 않는다(§4.2).
`/preview` 복구 여부는 사용자 승인 항목으로 올린다. → `STATUS.md` 승인 대기 참조.

---

## D-2. migration 18 을 신규 파일 대신 **직접 수정**

**규칙**: §2.1 "기존 마이그레이션 파일을 수정하지 않는다."

**예외 적용**: `…18_bread_and_monthly.sql` 은 **untracked(미커밋)** 이며 어떤 환경에도 적용된 적이 없다.
규칙의 취지는 "이미 적용된 마이그레이션의 재실행 불일치 방지"인데 18은 그 대상이 아니다.

취약한 버전(임의 재화 발행 가능)을 파일로 남기고 19에서 덮으면,
누군가 18만 적용하는 순간 구멍이 열린다. **취약 버전을 애초에 존재시키지 않는 쪽이 안전하다.**

**조치**: 18을 직접 수정. 19는 **18과 무관한 기존 구멍**(users/usage_logs/RPC)만 다룬다.

---

## D-3. `open_bread()` 경제 파라미터를 DB 상수로 고정

**대안 검토**
- (a) 함수 인자 유지 + 서버에서만 호출 → 사용자 EXECUTE 를 막아야 하는데, PostgREST service_role
  폴백 이슈(`CLAUDE.md` 블로커 #1) 때문에 `anon/authenticated` EXECUTE 가 필요한 구조다. 불가.
- (b) 별도 config 테이블 → 조회 비용 + 테이블 자체의 RLS 를 또 지켜야 함. Phase 0 범위 초과.
- (c) **함수 내부 constant** ← 채택

**결과**: 값 변경은 새 마이그레이션의 `create or replace` 로만 가능. `src/lib/credits.ts` 의 `BREAD` 는
**UI 표시 전용**이며 권한이 없음을 주석으로 명시. 두 값의 동기화는 향후 `PolicyConfig`(§2.4)로 통합 대상.

---

## D-4. `bread_opens` / `monthly_readings` 를 SELECT-only 로

직전 세션은 "`interpretations` 가 select/insert 만 있어 재생성(UPDATE) 경로가 취약했다"는 이유로
18에서 `for all` 을 줬다. **이 진단은 맞았지만 처방이 반대였다.**

`interpretations` 의 실제 쓰기 경로는 전부 admin client 다. 문제는 "사용자 권한이 부족한 것"이 아니라
"admin client 가 진짜 service_role 로 동작하는지 불확실한 것"이었다. 사용자에게 쓰기를 열면
**유료 결과를 직접 만들어 페이월을 우회**할 수 있다(`monthly_readings.tier='detail'`).

**조치**: 두 테이블 모두 SELECT-only + 쓰기 grant 회수. admin client 신뢰성 문제는 §3.1 #5 로 별도 처리.

---

## D-5. 순수 도메인 모듈 `src/domain/` 도입 시작

`MonthlyTeaser`(클라이언트)가 `lib/llm/monthly`(LLM 클라이언트 import)에서 파서를 가져오면
LLM SDK 가 클라이언트 번들에 포함된다. 명세 §2.5 목표 아키텍처의 `src/domain`(Next/DB/LLM import 금지)을
이 지점부터 도입해 `src/domain/monthly/summary.ts` 로 분리했다.

`lib/llm/monthly.ts` 는 하위호환 re-export 를 남겨 기존 서버 import 를 깨지 않는다.

---

## D-6. `callback/route.ts` 의 users upsert 를 admin client 로

migration 19 가 `authenticated` 의 `users` INSERT/UPDATE 를 회수하므로, 유저 클라이언트로
`kakao_id`·`attr_*` 를 쓰던 가입 경로가 깨진다. 해당 라우트는 이미 서버 전용이라 admin 사용이 안전하다.

⚠️ **적용 순서 의존성**: 이 코드 배포가 migration 19 적용보다 **먼저**여야 한다.
반대로 하면 그 사이 신규 가입이 실패한다. → `STATUS.md` 배포 순서 참조.

`/api/me/push` 는 `push_enabled`·`push_token`·`push_time` 만 쓰므로 컬럼 grant 로 커버되어 무변경.

---

## D-7. 로그인 정책 확정 — 카카오 단일, 비로그인 진입 없음 (D-1 해소)

**2026-08-14 사용자 지시**: "로그인 없이 사주보기 없애줘 / 테스트로그인도 없애줘 / 완전 상용앱 수준으로 정리".

D-1 에서 보류했던 충돌(사용자의 카카오 전용 축소 vs 명세 §12 추가 로그인·§6.2 비로그인 진입)이
**사용자 지시로 확정**됐다. §2.4 우선순위 2(날짜가 명확한 승인 정책)가 4(프롬프트의 새 제품 결정)를 이긴다.

**확정 사항**
- 로그인 수단은 **카카오 하나**. 이메일/Google/Naver/Apple adapter 는 만들지 않는다.
  (iOS Sign in with Apple 요구는 제3자 로그인을 *추가*할 때 발생하므로 현재 해당 없음)
- **비로그인 미리보기 없음.** `/preview` 라우트 삭제, 308 → `/login`.
- **익명/테스트 로그인 없음.** (사용자가 `api/test/bootstrap` 을 이미 제거)

**부수 효과**: 명세 §6.2 의 `/login?next=&product=` 복귀 동선은 여전히 유효하다
(비로그인 상품 클릭 → 로그인 → 원래 상품). `safeNext` 가 origin 검증으로 이를 안전하게 지원한다.

---

## D-8. 없는 기능의 마케팅 표면 제거 (궁합·대운·택일)

랜딩 FEATURES·JSON-LD featureList·llms.txt·`(seo)` 랜딩 3종·전역 키워드·App Store 리스팅이
v2 에서 삭제된 궁합·대운·택일을 계속 광고하고 있었다.

**왜 문제인가**
- 유입 후 즉시 이탈 (기대 불일치)
- App Review **Guideline 2.3(부정확한 메타데이터)** — 이 앱은 **4.3(b) 리젝 이력(2026-05-22)** 이 있어
  메타데이터 정확성 리스크가 특히 크다
- 체류시간 악화로 SEO 점수까지 깎임

**조치**
- 랜딩 FEATURES 4개를 **실제 존재하는 기능**으로 교체 (전체 풀이 / 오늘의 운세 / 꼬북이 대화 / 일주 캐릭터)
- `SEO_PAGES` 에서 `/gunghap`·`/daewoon`·`/taegil` 제거, `SITE_KEYWORDS`·`SITE_DESCRIPTION`·
  `<title>`·JSON-LD featureList·llms.txt 동기화
- **삭제 대신 308 영구 리다이렉트**(`next.config.ts`) — 기존 색인·외부 링크가 404 를 만나지 않게 흡수
- `robots.ts` 재작성: 죽은 disallow 제거, **`/admin` 차단 추가**(이전엔 색인 대상이었음)
- `APP_STORE.md` 리스팅 동기화. ⚠️ **앱 이름은 바꾸지 않는다** — 4.3(b) 를 캐릭터 IP 포지셔닝으로
  통과했으므로 이름을 사주 키워드로 바꾸면 그 근거가 무너진다. 사주 키워드는 부제·키워드 필드로만.
- 랜딩의 "검색엔진과 AI가 이해하기 쉬운…" 섹션을 **사용자 대상 카피**로 교체
  (SEO 자기소개를 사용자에게 보여주는 건 상용 앱 품질이 아니다)


---

## D-9. 가격의 단일 진실 = `src/domain/policy/catalog.ts`

명세 §2.4 는 "가격·무료권·재화 교환·환불·동의 문안은 `effective_at`·`policy_version` 을 가진
서버 소유 PolicyConfig 에서 파생한다"를 요구한다.

**선택**: DB 테이블이 아니라 **코드 상수 + `POLICY_VERSION`** 으로 시작한다.

- 지금 규모에서 가격 변경 빈도는 낮고, DB 테이블로 만들면 조회 1회가 모든 과금 경로에 붙는다.
- 대신 **구매 시점 스냅샷**(`price_asset`·`price_amount`·`policy_version`)을 `reports` 에 저장해
  소급 적용을 막는다. 이게 §2.4 의 실질 요구사항이다.
- 운영 중 가격을 바꿔야 하면 `POLICY_VERSION` 을 올리고 배포한다. DB 설정으로의 이행은
  운영 요구가 생겼을 때 (Phase 8).

`src/lib/credits.ts` 의 `CREDIT_COSTS` 는 **파생값**으로 바꿨고,
`src/lib/__tests__/credits-catalog.test.ts` 가 두 값의 일치를 강제한다.

⚠️ 택일 가격이 `PRICING.md` v2.1(3알)과 명세 §5.2(4알)에서 달랐다. §2.4 우선순위상
"이 프롬프트의 새 제품 결정"(4순위)이 `PRICING.md`(7순위)를 이기므로 **4알**을 채택했다.
`PRICING.md` 동기화는 Phase 8.

---

## D-10. 상태 전이는 DB CAS 로만, 허용표는 SQL↔TS 이중 정의 + 테스트로 동기화

`reports.state` 전이를 앱에서 `UPDATE ... SET state = ?` 로 하면 동시 요청 시 두 워커가
같은 리포트를 생성하거나, 결제 전 상태에서 생성으로 건너뛸 수 있다.

**선택**: `report_transition(report_id, from, to, patch)` RPC 하나만 두고
`WHERE id = ? AND state = ?` 로 **compare-and-swap** 한다. 앱은 직접 UPDATE 하지 않는다.

허용표가 SQL(migration 21)과 TS(`src/domain/reports/state.ts`) 두 곳에 존재하는데,
이건 의도적이다 — DB 는 최종 방어선이고 TS 는 UI 판단에 필요하다.
대신 `src/domain/__tests__/report-state.test.ts` 가 **SQL 파일을 파싱해 TS 허용표와 대조**하므로
둘이 갈라지면 테스트가 실패한다.

`failed` 를 terminal 로 두지 않은 이유: 재시도(§6.3)가 필요하다. 단 같은 idempotency key 를
쓰므로 이중 과금이 나지 않는다.

---

## D-11. 무료권은 reserve → consume | release 3단계

명세 §8.7: "AI 호출 전 entitlement 를 reserve 한다. 성공 시 consume 한다.
실패/timeout 이면 정확히 한 번 release/refund 한다."

`granted / reserved / consumed / released` 4개 카운터를 두고,
가용분 = `granted - reserved - consumed` 로 계산한다.
DB `check (reserved + consumed <= granted)` 가 초과 소비를 최종 차단한다.

`release` 는 `reserved > 0` 조건을 WHERE 에 넣어 **이미 consume 된 건은 반환하지 않는다**
(이중 반환 방지). 동시에 두 번 release 를 호출해도 한 번만 성공한다.

window 는 KST 벽시계 기준으로 계산하되 저장은 UTC timestamptz 다.
채팅 질문권 23:00, 오늘의 운세 00:00 경계는
`src/domain/__tests__/entitlement-window.test.ts` 14건이 지킨다.
