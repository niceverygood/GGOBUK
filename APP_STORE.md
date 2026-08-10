# App Store 제출 플레이북 — 꼬북점 (iOS)

> 4.3(b) Design-Spam 리젝 대응 + 재제출용. 빌드5 기준.
> 앱 정체성: **점/운세 앱이 아니라, 오리지널 캐릭터(거북이 4마리) AI 컴패니언**으로 재포지셔닝.
> ⚠️ 여기 카피는 **실제 존재하는 기능만** 담았다(과장 금지 — 과장하면 2.3 리젝 위험).

## 빌드/식별 정보
- Version (MARKETING_VERSION): `1.0.0`
- Build (CURRENT_PROJECT_VERSION): `5`
- Bundle ID: `com.niceverygood.ggobuk`
- Team: `7AXRWTV5YW`
- 디바이스: iPhone 전용 (TARGETED_DEVICE_FAMILY = 1)
- 구조: Capacitor 원격 래퍼 (`server.url = https://ggobuk.vercel.app`) — 네이티브 셸이 라이브 웹을 로드. 콘텐츠 변경은 Vercel 배포로 즉시 반영(iOS 재빌드 불필요). 단 네이티브 메타(Info.plist/빌드번호) 변경은 재아카이브 필요.

---

## ① 업로드 절차 (요약)

### A. Xcode 아카이브 → 업로드  *(너만 가능 — 나는 대행 불가)*
1. `open ios/App/App.xcodeproj`  (워크스페이스 없음, SPM)
2. TARGETS `App` ▸ Signing & Capabilities: Automatically manage signing ☑, Team `7AXRWTV5YW`, Bundle `com.niceverygood.ggobuk`
3. 상단 디바이스 드롭다운 ▸ **Any iOS Device (arm64)** (시뮬레이터면 Archive 비활성)
4. General에서 Version `1.0.0`, Build `5` 확인
5. **Product ▸ Archive** → Organizer 자동 오픈
6. Organizer ▸ **Distribute App ▸ App Store Connect ▸ Upload** (옵션 기본값)
7. 처리(Processing) 5~30분 대기 → 완료 이메일

### B. App Store Connect — 빌드 연결·메타·제출
appstoreconnect.apple.com ▸ 나의 앱 ▸ 꼬북점 ▸ (리젝된) 1.0 버전
1. 빌드 섹션 ▸ build4 제거 → **build5 선택**(처리 완료 후 노출)
2. ② 메타데이터 갱신 (아래)
3. 카테고리: 기본 **엔터테인먼트** / 보조 **라이프스타일**
4. ④ 스크린샷 교체 (아래)
5. App 심사 정보: 데모 계정(필요 시) + 메모 + 연락처
6. 저장 ▸ Submit for Review

### C. ③ Resolution Center 회신
App Store Connect ▸ 앱 ▸ App Review ▸ Resolution Center ▸ 영문 회신(아래) 붙여넣기 ▸ Submit. 재제출과 함께.

---

## ② 메타데이터 (복붙용)

### 한국어 (ko)
- **이름** (≤30자): `꼬북점: 나의 AI 거북이`
- **부제** (≤30자): `오늘 운세·사주·궁합을 한눈에`
- **프로모션 텍스트** (≤170자): `오늘 운세부터 내 사주와 궁합까지, 원하는 풀이를 쉽고 직관적으로 확인해 보세요.`
- **키워드** (≤100자, 쉼표구분/공백없이): `거북이,캐릭터,오늘운세,일주,성격유형,자기이해,궁합,인연,심리테스트,사주,명리,대운,길일`
- **설명**:
```
꼬북섬에는 성격이 제각각인 거북이 네 마리가 살아요.

🐢 꼬북이 — 어려운 말 없이 쉬운 풀이
🧙 꼬북도사 — 명리 근거까지 깊은 풀이
🔮 꼬북무당 — 결론부터 빠르고 직설적인 풀이
🙏 꼬북보살 — 공감을 담은 따뜻한 풀이

네 마리는 모두 같은 사주를 서로 다른 깊이와 말투로 풀어줘요.
나에게 가장 편한 풀이 스타일을 골라 보세요.

■ 나를 닮은 캐릭터, 일주 카드
태어난 날로 정해지는 '나의 일주' 캐릭터 카드를 만들어 드려요.
60종 중 하나뿐인 내 카드를 친구에게 공유하고 "넌 무슨 일주야?" 물어보세요.

■ 쉽고 깊이를 고를 수 있는 AI 풀이
핵심만 쉽게 보거나, 명리 근거까지 자세히 읽을 수 있어요.

■ 친구와의 궁합
링크 하나로 친구를 초대하면 둘의 캐릭터가 얼마나 잘 맞는지 보여드려요.

■ 오늘의 흐름
매일, 오늘 하루를 어떻게 보내면 좋을지 짧은 가이드를 받아보세요.

· 구독 없이 시작할 수 있어요.
· 사주·명리를 모티프로 한 엔터테인먼트 콘텐츠입니다. 재미로 즐겨주세요.
```

### English (en-US)
- **Name** (≤30): `Kkobukjeom: My AI Turtles`
- **Subtitle** (≤30): `Daily fortune, saju and match`
- **Promotional text** (≤170): `See today's fortune, your saju profile, compatibility, and life timeline in one clear app.`
- **Keywords** (≤100): `turtle,character,daily,fortune,personality,self-discovery,compatibility,quiz,saju,zodiac,timeline`
- **Description**:
```
Four turtles with very different personalities live on Kkobuk Island.

🐢 Kkobuk — simple, everyday explanations
🧙 Dosa — deep readings with traditional reasoning
🔮 Mudang — quick and direct conclusions
🙏 Bosal — warm, empathetic guidance

They're all the same turtle, but each explains your reading at a different depth and tone.
Pick the style that feels easiest to understand.

■ A character that's you — your Ilju card
Get a one-of-60 character identity card based on your birth date.
Share it with friends and ask, "Which one are you?"

■ AI readings with selectable depth
Choose a simple summary or a detailed reading with traditional reasoning.

■ Compatibility with friends
Invite a friend with a single link and see how well your characters match.

■ Today's flow
Get a short daily guide on how to make the most of your day.

· Free to start — no subscription required.
· Entertainment content inspired by Korean astrology (saju). For fun only.
```

---

## ③ Resolution Center 회신문 (영문, 복붙용)

```
Hello, and thank you for the review.

We have substantially repositioned Kkobukjeom and would like to clarify what the app actually is.

Kkobukjeom is an original-character fortune app set on "Kkobuk Island," home to four turtle styles we designed and wrote in-house. Each style explains the same calculated saju data with a different level of depth and tone.

The app is meaningfully different from a generic template:
1. Original IP — the four turtle characters, their artwork, and their world are our own original creations, not a reskinned template.
2. Selectable AI reading depth — users can choose simple, direct, empathetic, or traditional explanations.
3. Personality identity cards — each user receives a collectible character card based on their birth data (a "16Personalities-style" identity) that is designed to be shared.
4. Social compatibility — users invite friends with a link to see how their characters match.

We have updated the listing to reflect this:
- Primary category changed to Entertainment (secondary: Lifestyle).
- Name, subtitle, description, keywords, and screenshots now lead with the characters and the clear fortune-reading experience.
- Any astrology-derived content is presented as entertainment content.

Additional notes for review:
- The app is free to use for the review; there is no subscription wall.
- We offer Sign in with Apple alongside our other sign-in option.

We respectfully request a re-review under the updated metadata. If a concern remains, we would welcome the opportunity to discuss it with the App Review Board.

Thank you for your time.
```

---

## ④ 스크린샷 플랜 (6.9" iPhone, 1320 × 2868 px)

iPhone 전용이라 6.9" 한 사이즈만 있으면 됨(iPad 스크린샷 불필요).

| # | 화면 | 캡션(예시) | 라우트 |
|---|------|-----------|--------|
| 1 | 풀이 스타일 선택 | 쉬운 풀이부터 깊은 풀이까지 | `/mode` |
| 2 | 사주 풀이 | 원하는 주제만 골라서 보기 | `/shell` |
| 3 | 일주 캐릭터 카드 | 태어난 날로 만든 나만의 캐릭터 | `/ilju/[slug]` (공개) |
| 4 | 친구 궁합 | 우린 얼마나 잘 맞을까? | `/relations` |
| 5 | 오늘의 흐름 | 오늘 하루, 이렇게 보내봐 | `/home` (오늘의 흐름 카드) |
| 6 | 운세 달력 | 한 달의 흐름을 한눈에 | `/calendar` |

**규칙**
- ❗ **1번(첫 장)에 복잡한 결과표를 두지 말 것** — 풀이 스타일과 캐릭터를 먼저 보여줄 것.
- 캡션은 이미지에 텍스트 오버레이로(스토어가 자동으로 안 넣음).

**캡처 방법 (정확한 해상도)**
- Xcode ▸ 시뮬레이터에서 **iPhone 16 Pro Max(6.9")** 실행 → 로그인 → 화면 이동 → **⌘S**(파일 저장) → 정확히 1320×2868 PNG 저장.
- 또는 실기기(6.9" 모델)에서 캡처.
- ⚠️ 데스크톱 브라우저 창 리사이즈로는 1320×2868 세로 비율이 안 나옴(실측 확인). 시뮬레이터/실기기 권장.

---

## ⑤ Sign in with Apple — 외부 설정 체크리스트

> 코드는 **이미 구현 완료**(`login/page.tsx`의 `signInWithApple()` + "Apple로 계속하기" 버튼, `callback/route.ts`의 `provider=apple` 분기). 남은 건 **포털/대시보드 설정뿐** — 전부 시크릿이라 네가 직접 입력(절대 커밋 금지).

### Apple Developer (developer.apple.com)
1. Certificates, IDs & Profiles ▸ Identifiers ▸ `com.niceverygood.ggobuk` ▸ **Sign in with Apple** capability 체크 ▸ Save.
2. Identifiers ▸ `+` ▸ **Services IDs** 생성 (예: `com.niceverygood.ggobuk.web`) ▸ Sign in with Apple 활성 ▸ Configure:
   - Primary App ID: `com.niceverygood.ggobuk`
   - Domains and Subdomains: `zaifbeulgqmhzeewkbtd.supabase.co` (필수 — 아래 Return URL의 도메인)
   - Return URLs: `https://zaifbeulgqmhzeewkbtd.supabase.co/auth/v1/callback`
3. Keys ▸ `+` ▸ Sign in with Apple 활성 ▸ 생성 ▸ **.p8 키 다운로드(1회뿐)** + **Key ID** 기록 (Team ID = `7AXRWTV5YW`).

### Supabase (Dashboard ▸ Authentication ▸ Providers ▸ Apple)
- Apple 활성화
- **Client IDs** = `com.niceverygood.ggobuk.web,com.niceverygood.ggobuk` (웹 Services ID + 네이티브 번들 ID, 쉼표구분)
- **Secret Key (for OAuth)** = `.p8` + Key ID + Team ID(`7AXRWTV5YW`) + Services ID로 생성한 client secret JWT (Supabase 문서의 생성기 사용; **≤6개월 만료 → 갱신 필요**)
- Save
- Authentication ▸ URL Configuration: Site URL `https://ggobuk.vercel.app`, redirect 허용목록에 `https://ggobuk.vercel.app/callback` 포함 — **카카오가 동일 패턴을 쓰므로 이미 설정돼 있을 것**(확인만).

> 프로젝트 ref `zaifbeulgqmhzeewkbtd` 는 `NEXT_PUBLIC_SUPABASE_URL`(`https://zaifbeulgqmhzeewkbtd.supabase.co`)에서 확인됨.
> ⚠️ 웹뷰(WKWebView) 안에서 Apple 웹 OAuth가 막히면 `@capacitor-community/apple-sign-in` 네이티브 플러그인 + nonce 플로우로 전환(별도 작업). 우선 웹 플로우로 시도.

---

## ⑥ 네이티브 변경 사항 (이번 빌드)
- `Info.plist`에 `ITSAppUsesNonExemptEncryption = false` 추가 — 앱은 표준 HTTPS/TLS만 사용(면제) → 업로드 시 암호화 질문 안 뜸.
- 빌드번호 4 → 5.
- 코드/메타 재변경 후 다시 올릴 땐 build **6** 으로 올릴 것(번호 재사용 불가).

## ⑦ 주의 — 결제 (3.1.1 / 4.8)
- iOS 인앱 디지털 재화(꼬북알)는 StoreKit IAP 필요. 카카오페이 웹 결제는 iOS에서 노출 금지.
- 현재 네이티브 앱(iOS)에선 충전 UI를 숨기는 게 안전(웹 전용 결제 유지). 정식 iOS 인앱 매출은 StoreKit 구현 후.
