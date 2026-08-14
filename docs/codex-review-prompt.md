# 코덱스 기능검수 프롬프트 (v2 대단순화)

> 사용법: 터미널에서 아래를 실행한 뒤, 구분선 아래 프롬프트 **전문**을 복사해 붙여넣으세요.
>
> ```bash
> cd /Users/seungsoohan/Projects/GGOBUK/kkobukjeom
> codex
> ```

---

# 꼬북점 v2 대단순화 커밋 기능검수 (읽기 전용)

너는 시니어 코드 리뷰어다. 이 저장소(Next.js 16 App Router + React 19 + Supabase + TypeScript strict,
한국어 사주 앱 "꼬북점")의 커밋 `933107a` **"feat!: v2 simplification"** 을 검수하라.
코드를 수정하거나 커밋하지 말고, **코드로 실증된** 발견사항만 보고하라.

## 배경 — 이 커밋이 무엇인지

앱을 4개 핵심 기능만 남기고 축소했다 (131 files, +1,091 / −17,541).

- **남긴 것**: ① 일주 캐릭터 카드(홈 히어로 + 공유) ② 오늘의 운세(홈) ③ 전체 풀이 한 편(`/shell`) ④ 꼬북이 채팅(`/chat`)
- **제거**: 궁합/인연, 보관함, 달력, 대운 타임라인, 길일, 부적, 웹툰, 콜드리딩, 유즈케이스,
  페르소나 모드선택(꼬북이 단일 고정), 장기기억, 첫충전특가, 초대/공유 라우트
- **하단 탭 4 → 2** (홈 / 내 정보). 상점은 `/store` 신설 (구 `/more/pro` 대체)
- **재작성**: `src/lib/llm/interpret.ts`(1,300줄→250줄, 12카테고리×4페르소나 → 단일 문서),
  `api/interpretations/regenerate`, `lib/credits.ts`(과금 2종), `(main)/store`, `(main)/shell`,
  `(main)/home`, `nav/BottomNav`, `preview/result`
- **신규**: `components/shell/FullReadingPanel.tsx`, `(main)/chat/page.tsx`
- **HEAD~1에서 복원 후 단순화**: `lib/llm/chat.ts`, `components/chat/*`, `api/chat/route.ts`
  (채팅은 직전 커밋에서 삭제됐다가 이번에 부활)
- **무변경이어야 함**: SEO 표면(`(seo)/**`, `/ilju/[slug]` 60종, `/api/og/ilju`, `/preview`),
  결제 인프라(`/api/payment/**`), 푸시, admin, 사주 계산 엔진(`src/lib/saju/**`)

## 절차

1. `git show --stat 933107a`, `git diff HEAD~1 HEAD` 로 변경 범위 파악
2. 게이트 재현: `pnpm install` → `pnpm exec tsc --noEmit` → `pnpm exec vitest run` → `pnpm build`
   (pnpm 10.15.0 고정. corepack이 11을 잡으면 `/usr/local/bin/pnpm` 직접 사용)
3. 아래 **1부**를 하나씩 실증한 뒤, **2부**로 목록에 없는 것을 찾아라

---

# 1부 — 반드시 실증할 불변조건

각 항목은 "확인해야 할 의심"이지 확정된 결론이 아니다. **확인(CONFIRMED) / 반증(REFUTED) / 판정불가(UNKNOWN)**
중 하나로 판정하고 `파일:라인` 근거를 붙여라.

## A. 돈 — 최우선 (실결제 사고 직결)

**A-1.** `CREDIT_PACKAGES` 5종(mini/entry/focus/deep/master)의 **id·credits·bonusCredits·priceKrw가
HEAD~1 대비 한 글자도 바뀌지 않았는가.** 카피(caption/badge/perks)만 바뀌어야 한다 —
이 값들은 심사 제출된 네이티브 IAP 상품과 1:1 매핑이라 변경 금지.
→ `git diff HEAD~1 -- src/lib/credits.ts` 의 해당 블록에서 그 4개 필드에 +/- 가 없음을 확인.
교차검증: `scripts/asc-iap-setup.mjs` 의 PRODUCTS 와 `totalCredits(pkg)` 를 한 줄씩 대조.

**A-2.** 카카오페이 `ready`/`approve` 의 **모든 리다이렉트가 `/store`** 인가 (삭제된 `/more/pro` 잔재 0건).
지급 금액은 URL 파라미터가 아니라 **DB pending row 의 package_id 기준**인가(금액 위변조 방어).
→ `grep -rn "/more/pro" src` 는 0건이어야 한다.

**A-3.** `firstdeal` 의 반쪽 은퇴 상태를 양방향으로 확인하라.
(a) **해석 방향**: `iapGrantForProduct('ggobuk.credits.firstdeal')` 이 여전히 20알(12+8)을 반환해
과거 미소비 구매의 재검증이 정상 지급되는가 (`creditPackageById` → `RETIRED_PACKAGES` 폴백).
(b) **도달성**: 앱 어디에도 구매 진입점이 없는데 `IAP_PRODUCT_IDS` 와 스토어 상품은 살아 있지 않은가
(도달 불가 IAP 상품 = "unable to locate the in-app purchase" 심사 리젝 사유).

**A-4.** `/api/payment/iap/verify` 는 무변경인가 (v3 심사 대기 중 — 회귀 시 치명적).

**A-5.** 서버에 **플랫폼 게이팅이 없는지** 확인하라. `/api/payment/kakao/ready` 가 요청 출처를 보지 않고
누구에게나 카카오페이 결제를 준비한다면, 네이티브 차단은 순수 클라이언트 UI 게이트뿐이라는 뜻이다.
Play/App Store 결제정책 관점에서 이게 허용 가능한 수준인지 판단하라.

## B. 전체 풀이 저장 계약 (마이그레이션 없이 동작해야 함)

**B-1.** 새 풀이는 `interpretations` 에 `category='overview'`, `persona='kkobuk'` 로 저장된다.
이 값이 마이그레이션 1의 category CHECK, 마이그레이션 9의 persona CHECK 에 실제로 포함되는가.
upsert 의 `onConflict: 'saju_id,category,persona'` 가 마이그레이션 9가 만든 unique 제약과 **정확히** 일치하는가.
(주의: CLAUDE.md 가 2026-06-10 prod 스키마 드리프트로 mig 9 누락 이력을 기록하고 있다 — 이 전제는 실측 대상이다.)
→ DB 실측 쿼리:
```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint where conrelid='public.interpretations'::regclass;
```
`interpretations_saju_id_category_persona_key` 가 있고 구 `..._saju_id_category_key` 가 없어야 한다.

**B-2. ⚠️ 최우선.** `interpretations` 에 **SELECT·INSERT RLS 정책만 있고 UPDATE 정책이 없다**
(`supabase/migrations/00000000000002_rls.sql`). 그렇다면 upsert 가 `ON CONFLICT DO UPDATE` 경로
(= **"다시 풀어보기" 재생성**)를 탈 때 저장 클라이언트가 진짜 service_role 이 아니면 반드시 실패한다.
**첫 생성(INSERT)은 성공하고 재생성만 실패하는 비대칭**이라 수동 QA에서 놓치기 쉽다.
→ 실패 시 route 는 5알을 환불하고도 **본문은 그대로 반환**한다. 즉 "재생성은 영원히 무료 + 캐시는
영원히 갱신 안 됨". v2의 유일한 유료 산출물이 이것이므로 매출 누수 지점이 정확히 여기다.
전 마이그레이션 전수 확인: `grep -rn "on public.interpretations" supabase/migrations/`

**B-3.** `createServerClient({ admin: true })` 가 service_role 키를 쓰면서도 **요청 쿠키를 함께 주입**하는지
확인하라. 그렇다면 로그인 세션이 있는 요청에서 supabase-js 가 Authorization 을 사용자 JWT 로 채워
"관리자 클라이언트"가 실제로는 사용자 권한으로 동작할 수 있다. 추가로 `SUPABASE_SERVICE_ROLE_KEY`
미설정 시 anon 키로 조용히 폴백하는지도 확인.
→ 여기에 v2의 두 돈줄이 모두 걸려 있다: (a) 풀이 캐시 upsert (b) `add_credits`(마이그레이션 13이
`is_service_role()` 아니면 forbidden raise) = **모든 환불과 카카오페이 지급**.
`spend_credits` 만 `auth.uid()` 우회 경로가 있어 **"차감은 되는데 환불은 안 되는"** 비대칭이 성립할 수 있다.

**B-4.** v1 레거시 row 와 v2 문서가 **같은 키를 공유하는데 버전 마커가 없다.** v1에서 `overview`(총평)는
무료 카테고리였고 꼬북이 페르소나도 선택 가능했으므로 기존 사용자 상당수가 이미 이 키에 v1 포맷 row 를 갖고 있다.
`/shell` 이 포맷 검증 없이 그대로 "전체 풀이"로 렌더하면 **기존 사용자는 v2 6섹션 문서를 한 번도 못 보고
옛 총평을 새 기능으로 오인한다.**
→ DB 실측: `select count(*) from interpretations where category='overview' and persona='kkobuk' and generated_at < '2026-08-10';`
그중 하나의 content 에 v2 전용 헤딩(`## 나라는 사람`)이 없는지 확인.

**B-5.** 풀이 생성 경로가 **차감 실패에는 fail-closed(500)** 인데 **캐시 저장 실패에는 fail-open**
(환불하면서 본문은 반환)인지 확인하라. 환불 `addCredits` 가 `.catch(() => undefined)` 로 삼켜진다면,
환불마저 실패했을 때 "차감만 되고 저장도 환불도 안 된" 상태가 **아무 로그 없이** 성립한다.

## C. 채팅 (복원 기능)

**C-1.** `chat_messages` insert 두 곳의 **error 반환값을 검사하는가** (supabase-js 는 throw 하지 않고 `{error}` 반환).
검사하지 않는다면 저장 실패가 catch 에 도달하지 못해 **환불도 에러 표시도 없다.**
1알 차감 + 스트리밍 답변 후 assistant 메시지 저장이 조용히 실패하면 사용자는 새로고침 시 답변이 사라진 걸 보고
크레딧은 안 돌아온다. user 메시지 저장 실패면 다음 턴 history 에서 질문이 빠져 맥락이 어긋난다.

**C-2. ⚠️ 매출 누수.** 무료 5회 한도의 **읽기와 쓰기가 다른 날짜 기준**을 쓰는지 확인하라.
읽기 = `todayKstIso()`(KST), 쓰기 = `increment_chat_usage` RPC 의 `current_date`(DB 타임존, Supabase 기본 UTC).
그렇다면 KST 00:00~09:00 에는 증가분이 전날 행에 쌓이고 조회는 오늘 행을 봐 **카운터가 항상 0 → 무제한 무료**가 된다.
실효 리셋이 KST 09:00 이 되어 `PRICING.md` 의 "KST 자정 리셋" 약속과 어긋난다.

**C-3.** 채팅 한도 안내 문구가 **잘못된 상태에 붙어 있는지** 확인하라.
"오늘 무료 채팅 한도(5회)에 도달했어" 배너는 429 에서 뜨는데, `/api/chat` 의 429 는 **분당 20회 레이트리밋**
전용이 아닌가. 그렇다면 진짜 5회 소진 순간에는 **아무 안내 없이 조용히 1알이 빠지고**,
잔액이 없을 때만 402 가 뜬다 → 유료 전환 고지 미비.

**C-4.** 채팅 세션 get-or-create 가 `persona='kkobuk'` 로만 조회하는가.
그렇다면 v1에서 도사/무당/보살 세션만 갖고 있던 사용자는 **과거 대화가 통째로 안 보이고** 빈 새 세션을 받는다.

**C-5.** `chatStream()` 시그니처 변경(persona/memory 제거)과 콜사이트 일치,
`extractCitedCards` → `cited_cards` 기록 유지, SSE 이벤트 포맷과 `ChatThread` 파싱 일치,
`increment_chat_usage` RPC 가 마이그레이션에 실제 존재하는지 확인.

## D. 죽은 참조 · 라우트 지도

**D-1.** 삭제된 라우트로 가는 링크가 남은 소스에 0건인지 전수 스윕:
`/relations` `/library` `/calendar` `/timeline` `/mode` `/persona` `/use-case` `/people`
`/more/pro` `/more/auspicious` `/more/memory` `/invite` `/share/` `/shell/[카테고리]` `/chat/[세션id]`
(제외: `.next/`, `android/`, `ios/`, `scripts/`, `docs/`)

**D-2.** 삭제된 모듈 import 0건: `generation-lock`, `persona-mode`, `use-persona-mode`,
`INTERPRETATION_COST_BY_PERSONA`, `interpretationCostFor`, `isFreeInterpretation`,
`FREE_INTERPRETATION_KEYS`, `FIRST_DEAL_PACKAGE`, `premium-services`, `llm/memory`, `llm/compat`,
`llm/talisman`, `llm/comic`, `llm/auspicious`, `llm/coldread`, `components/relations`,
`components/timeline`, `components/library`

**D-3.** `middleware.ts` 의 isPublic, `sitemap.ts`, `robots.ts`, 실제 `src/app/(main)` 디렉터리 —
**이 4개가 서로 다른 시점의 라우트 지도를 들고 있지 않은가.**
`/ilju`·`/preview` 는 반드시 public 으로 남아야 한다(SEO·바이럴 진입점).
새로 생긴 `/store` 가 robots 목록에 없고 삭제된 경로들이 계속 disallow 되어 있지 않은가.

**D-4. ⚠️ 방향이 반대인 정리.** 공개 마케팅 표면(`src/app/page.tsx` 의 FEATURES·JSON-LD featureList,
`llms.txt`, `(seo)` 랜딩 5종, `lib/seo/pages.ts`)이 **제거된 궁합/대운/택일을 계속 광고**하고,
정작 **살아남은 채팅만 목록에서 삭제**되지 않았는가.
sitemap·middleware 가 이 랜딩들을 여전히 공개·색인 유지한다면, 검색으로 들어온 사용자가
"궁합 보기"를 기대하고 가입하는데 앱에는 탭 2개뿐이다 → 즉시 이탈 + 스토어 심사 시 웹/앱 기능 불일치 지적 소지.

## E. 크론 · 백그라운드

**E-1. ⚠️** `vercel.json` 의 유일한 cron 이 `/api/daily` 를 가리키는데, **Vercel Cron 은 GET 으로만 호출**하고
해당 라우트의 GET 은 로그인 세션을 요구하지 않는가. 벌크 생성·푸시 발송 로직이 **POST 핸들러에만** 있다면
아침 일괄 생성과 데일리 푸시가 전혀 안 돈다 → 오늘의 운세가 v2 리텐션 축인데 "푸시로 다시 부른다"는 루프가 성립 안 함.
→ 실증: `curl -i -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/daily` (GET) vs `-X POST` 비교.

**E-2.** `expire-interpretations` cron 이 제거되었는데, 그 결과 **풀이 보존 정책의 공백**이 생기지 않았는가.
반대로 `api/profiles/[id]` 의 `clearStaleProfileData` 가 생년월일 수정 시 해당 프로필의 interpretations 를
**전부 삭제**한다면, 사용자가 5알 주고 산 유일한 산출물이 오탈자 수정만으로 예고 없이 사라진다(클라이언트 경고 없음).
게다가 interpretations 에 DELETE RLS 정책도 없으므로(B-2 참조) 반대로 삭제가 조용히 실패해
"옛 사주로 만든 풀이가 그대로 남는" 역방향 버그도 가능하다 — **두 가능성을 모두 실측하라.**

## F. 프롬프트 ↔ 렌더러 계약

**F-1.** 새 `interpret.ts` 가 강제하는 `## 한눈에` 블록(`- 🔑 키워드:` / `- ✅ 이렇게 해봐:` / `- ⚠️ 이건 조심:`)이
`InterpretationBody.tsx` 의 `collapseTldr` 파서 시그니처와 **이모지 코드포인트 수준까지** 일치하는가
(⚠️ = U+26A0 U+FE0F 여부). 파서가 매칭 실패 시 **else 분기 없이 항목을 조용히 버리는지**도 확인.
`generateFallbackReading` 의 하드코딩 블록도 같은 시그니처를 지키는가.

**F-2. ⚠️ 프롬프트 내부 충돌.** 새 `READING_STYLE` 은 **한자(漢字) 완전 금지**를 지시하는데,
같은 system 에 합쳐지는 `prompts/premium_saju.ts` 의 `PREMIUM_SAJU_GUIDE` 는 반대로 **한자 병기를 "반드시"로 요구**하지 않는가.
같은 가이드가 `## 깊은 풀이` 헤딩과 `· ` 불릿 mini-block 을 **요구**한다면, 6섹션 고정·불릿 금지 규칙과도 충돌한다.
또 그 가이드의 `[카테고리별 강조 포인트]` 가 v1의 12카테고리(총평·재물운·좋은 방향…) 기준 그대로 남아 있다면
모델이 존재하지 않는 섹션을 만들어낼 수 있다. → **이 세 충돌을 각각 확인하고 영향도를 판정하라.**

**F-3.** 렌더러의 민트 강조 카드가 `한 줄 결론:` 접두사에만 반응하는데 현재 프롬프트는 `오늘부터 하나:` 를
쓰게 하지 않는가 → 그렇다면 마무리 강조 분기가 죽어 있다.

**F-4.** `daily.ts` 의 코드 측 방어(`stripHanja`)가 **한자만** 제거하고 **한글 명리 용어는 전혀 안 거르는지** 확인.
그렇다면 "오늘은 편인 기운이 강한 날" 같은 문장이 홈 카드에 그대로 노출될 수 있다(금지어는 프롬프트뿐).

## G. 클라이언트 에러 처리 · 콜드스타트

**G-1. ⚠️ 실제 재현됨.** 최초 진입 시 `EnsureDaily` 가 마운트 즉시 `/api/daily` 를 호출하는데
아직 AI 미동의라 **412** 가 떨어지고, `EnsureDaily` 는 ok/500/503 일 때만 refresh 하며 마운트당 1회만 실행된다.
`AiConsentGate` 의 동의 처리가 `router.refresh()` 를 하지 않는다면
**"오늘의 운세를 가져오는 중이야…"가 탭 이동/새로고침 전까지 영원히 남는다.**
(로컬 e2e 로그에서 `GET /api/daily → 412` 확인됨 — 재현 및 근본 원인 확정 요망.)

**G-2.** `412 ai_consent_required` 를 `FullReadingPanel` 과 `ChatThread` 어느 쪽도 처리하지 않는가
(둘 다 402/429 만 분기). `AiConsentGate` 가 조회 실패 시 state 를 낙관적으로 `'agreed'` 로 두고 모달을 안 띄운다면,
그 상태에서 사용자는 일반 실패 문구만 보고 **동의 모달을 다시 만날 방법이 없어 앱이 영구 먹통으로 느껴진다.**

**G-3.** AI 동의 모달에 **거부·닫기 버튼이 없는데** 본문은 "동의를 거부하면 사주 계산·등껍질 시각화는
그대로 사용할 수 있다"고 안내하지 않는가. 모달이 `(main)` 레이아웃 전역이라면 어디로 가도 재등장 →
사실상 "동의 아니면 앱 종료"뿐인 다크패턴에 가깝다.

**G-4.** 네이티브(iOS/Android)에서 잔액부족 안내의 "충전하러 가기"/"충전하기" 링크가
`isNativeApp()` 으로 숨겨지지 않는가. 자체 IAP 가 이미 있는데도 숨겨져 있다면 **TWA 정책 대응 시절 잔재이자
현재 시점의 매출 누수**다(사용자가 "내 정보 → 내 꼬북알"을 스스로 찾아야 함).

**G-5.** 구 Android TWA 설치분에서 `isTWA()=true` 인데 Capacitor/CdvPurchase 브릿지가 없다면
`NativeCreditStore` 가 **"항상 실패하는 결제 UI"** 를 노출하지 않는가(원화 폴백가 → 탭 → not_native 에러).

## H. 법무 · 정책 정합성

**H-1. ⚠️ 확인된 충돌.** `src/app/privacy/page.tsx` 는 채팅을 **"종료된 채팅 기능"** 이라 서술하고
AI 전송 정보 목록에서 **채팅 본문을 제외**했는데, **같은 커밋이 채팅을 핵심 기능으로 복원**했다.
실제로는 사용자 질문 + 직전 20턴 대화가 Anthropic/OpenRouter(미국)로 전송된다.
반면 앱 내 동의 모달(`AiConsentGate`)은 "채팅으로 직접 입력한 질문 내용"을 전송한다고 고지한다
→ **동의 화면과 그 화면이 링크하는 정책이 서로 모순.**
App Store 5.1.1(i) 및 국내 개인정보 국외이전 고지 의무 양쪽에 걸린다. 영향 범위를 정리하라.

**H-2.** `terms/page.tsx` 도 같은 방향의 불일치가 있는가(구 "메시지·채팅 서비스" 조항이 대체되었는지
`git diff HEAD~1 -- src/app/terms/page.tsx` 로 확인). 제거된 기능(궁합·매칭·부적·웹툰) 언급이
약관·방침에 남아 실제 서비스 범위와 어긋나는 지점을 전부 나열하라.

---

# 2부 — 목록에 없는 것 찾기

1부를 마친 뒤, **위 목록에 없는 결함**을 독립적으로 탐색하라. 특히:

- 삭제된 기능이 남긴 **DB 고아 데이터**(relations, saju_shares, user_memory, interpretation_comics 등)와
  그 테이블을 참조하는 코드가 아직 있는지
- 타입 레벨 잔재(`InterpretationCategory` 12개 유니온 등)가 **런타임 오동작**으로 이어질 수 있는 지점
- v1 사용자의 마이그레이션 경험 전반 (기존 데이터가 v2 화면에서 어떻게 보이는가)
- 접근성·성능·번들 크기 회귀

---

# 이미 아는 것 — 재보고 불필요

- `android/`·`ios/` cordova 번들 산출물, `scripts/verify-daily.ts`, `OfflineGuard`, `logger` 의 기존 lint 에러
- 구형 컴포넌트의 `set-state-in-effect` 관용구
- `src/types/db.ts` 의 12카테고리 `InterpretationCategory` 유니온·`MemoryKind` — 과거 row 해석용 **의도적** 유지
- `src/lib/llm/personas.ts` 의 4페르소나 프롬프트 잔존 — kkobuk 소스로 **의도적** 유지
- `middleware` → `proxy` deprecation 경고
- `BETA_FREE_MODE` 플래그 존재 자체, 미적용 마이그레이션 14(match_profiles)
- 로그인 화면의 "테스트 로그인 (익명)" 버튼 — 심사용, 제거 예정으로 이미 인지됨
- `/splash` 가 어디서도 링크되지 않는 고아 라우트인 점

# 금지

- 파일 수정·커밋·브랜치 생성 금지 (읽기 전용)
- `.env.local` 의 키 **값** 출력 금지
- 프로덕션 Supabase 쓰기 금지, LLM 과금 발생 스크립트 실행 금지
  (정적 분석 + tsc/vitest/build 로 충분. DB 실측이 필요한 항목은 **실행할 쿼리만 제시**하고 UNKNOWN 처리)

# 출력 형식

1. **판정**: 이대로 프로덕션에 둬도 되는가? (승인 / 조건부 승인 / 롤백 권고)
   — 이미 `main` 에 푸시되어 배포 파이프라인에 올라간 상태임을 감안할 것
2. **1부 판정표**: A-1 ~ H-2 각 항목에 `CONFIRMED / REFUTED / UNKNOWN` + 한 줄 근거(`파일:라인`)
3. **발견사항**: 심각도(Critical / Major / Minor) 순으로
   - `파일:라인` + 한 줄 결함 설명
   - **구체적 실패 시나리오** (어떤 입력·상태에서 무엇이 잘못되는지)
   - 제안 수정
   - 1부 항목 번호 또는 "신규(2부)" 표기
4. **게이트 결과**: tsc / vitest / build 원문 요약
5. **확신 없는 것**: 별도 "미확증" 섹션으로 분리 (추측을 발견사항에 섞지 말 것)
