# MASTER_PLAN — 단계·의존성·완료기준

각 Phase 는 **feature flag 뒤에서** 독립적으로 켜고 끌 수 있어야 하며, 완료기준을 통과해야 다음으로 간다.
전 단계 공통 게이트: `tsc --noEmit --incremental false` / `vitest run` / `lint` / `build`.

| Phase | 내용 | 선행 | 완료기준 |
|---|---|---|---|
| **0** ✅ | Baseline 안정화, P0 보안 | — | 게이트 4종 green, 권한상승 회귀 테스트 존재 |
| **1** | Foundation | 0 | domain/application/infrastructure 골격, 대표프로필, reports/report_jobs, 꼬북잎·entitlement, CI |
| **2** | 홈·프로필·내비 | 1 | 5탭 셸, 질문권 카드, 2열 그리드, 대표 선택 dialog, 로그인 후 동선 복귀 |
| **3** | 핵심 리포트 | 1,2 | 전체사주·궁합·대운·연도별 + preview→purchase→job→result→refund 공통 파이프라인 |
| **4** | 리텐션 | 3 | 오늘의 운세(입력·무료권·추가과금), 수다방(23:00 질문권·유료회차·streaming), 거북빵 충돌 정리 |
| **5** | 택일 | 3 | 달력 2~10일·12개월, 무료 분석 + 유료 Top3, share/PDF 범위 분리 |
| **6** | 지갑·선물·교환권 | 1,3 | 2재화 표시·거래내역, 원자 교환, 선물 상태머신, 교환권 2종, IAP 회귀 |
| **7** | 보관함·공유·PDF·문의 | 3~6 | 전 유형 보관함, 공개범위 share+revoke, PDF, 문의 스레드 |
| **8** | 운영·정책·출시 | 전부 | admin+감사로그, 약관/개인정보/스토어 메타 일치, 알림, 접근성·성능·네이티브 QA, rollout/rollback runbook |

## Phase 1 상세 (다음 작업)

1. **아키텍처 골격** — `src/domain`(순수) / `src/application`(use case) / `src/infrastructure`(adapter).
   Phase 0 에서 `domain/monthly/summary.ts`, `domain/persona/display.ts` 로 이미 시작함.
2. **대표프로필** — `users.representative_profile_id`, `relation_type='self'` 유일 가정 제거,
   소유권 DB 검증(trigger 또는 RPC), `PATCH /api/me/representative-profile`.
   ⚠️ 현재 `relation_type='self'` 를 유일 대표로 쓰는 곳: `home/page.tsx`, `shell/page.tsx`, `chat/page.tsx`,
   `api/monthly`, `api/bread/open`, `api/interpretations/regenerate`, `callback/route.ts`, `api/daily`(벌크).
3. **reports / report_jobs** — 상태머신 `draft→previewing→preview_ready→payment_pending→queued→generating→completed|failed|cancelled`,
   `profile_snapshot`, `idempotency_key`. 기존 `interpretations` 는 adapter 로 흡수.
4. **wallet v2 + entitlement** — expand→backfill→dual-write→shadow reconcile→flag read switch→contract.
   ⚠️ cutover 전에는 `users.credit_balance` 가 source of truth. 병렬 원장 금지.
5. **CI/스크립트** — `typecheck`, `test`, `format:check`, `db:verify` 추가 (현재 `package.json` 에 없음).
