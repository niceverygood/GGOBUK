# DATA_MODEL — 현재 스키마와 목표

## 현재 테이블 (migration 1~19)

| 테이블 | RLS | 정책 (Phase 0 이후) |
|---|---|---|
| `users` | on | select self / update self (**컬럼 grant 로 축소**: nickname·push_*) / insert 회수 |
| `saju_profiles` | on | all own |
| `interpretations` | on | select own (**insert 정책 제거, 쓰기 grant 회수**) |
| `chat_sessions` / `chat_messages` | on | all own |
| `daily_fortunes` | on | 소유 select (**쓰기 grant 회수**) |
| `usage_logs` | on | **select own** (기존 `for all` 제거) |
| `credit_purchases` / `credit_transactions` | on | 소유 select |
| `bread_opens` (18) | on | **select own** only |
| `monthly_readings` (18) | on | **select own** only |
| `relations`, `saju_shares`, `user_memory`, `match_profiles` 등 | — | 과거 기능 잔재. Phase 8 정리 대상 |

## 서버 전용 RPC

| 함수 | 가드 |
|---|---|
| `spend_credits` | `is_service_role() or auth.uid() = p_user_id` |
| `add_credits` | `is_service_role()` |
| `grant_signup_bonus` | `is_service_role()` |
| `open_bread` (18) | `is_service_role() or auth.uid() = p_user_id`, **경제 파라미터는 내부 constant** |
| `increment_chat_usage` / `increment_interp_views` (19) | 호출자 검증 + **KST 날짜 키** |

## 목표 모델 (Phase 1~6, additive)

```
users.representative_profile_id → saju_profiles.id   (소유권 DB 검증 필요)
users.leaf_balance, paid_chat_turns

saju_profiles: deleted_at, calculation_version, identity_hash(중복 방지 unique)
reports: type, primary/secondary_profile_id, profile_snapshot, preview, premium_result,
         payment_status, generation_status, price_asset/amount/version, idempotency_key
report_jobs: state, attempt, lease_until, heartbeat_at
entitlements: type, window_start/end, granted/reserved/consumed/released
wallet_accounts / wallet_lots / ledger_transactions / ledger_entries
gifts(token_hash, status: PENDING|CLAIMED|CANCELLED)
vouchers / campaigns / redemptions, shares, inquiries, notifications, audit_logs
deletion_requests / legal_retention_records
```

## 불변식 (cutover 게이트)
- 사용자·재화별 `sum(open lot remaining) = wallet projection = legacy balance`
- 음수 잔액 0건, external transaction/idempotency 중복 0건
- paid order ↔ grant 1:1, orphan 0건
- **한 건이라도 어긋나면 read switch 금지**

## 라이브 드리프트
**UNKNOWN.** `CLAUDE.md` 에 2026-06-10 드리프트 이력(mig 5·9·11·12·13·16 누락) 있음.
`migrations/…19_privilege_hardening.sql` 상단의 preflight SQL 을 사람이 먼저 실행할 것. 추정 적용 금지.
