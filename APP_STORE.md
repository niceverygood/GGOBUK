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

> ⚠️ **2026-08-14 동기화.** 이전 리스팅은 `/mode`(풀이 스타일 선택)·`/relations`(친구 궁합)·
> `/calendar`(운세 달력)를 광고했으나 v2 대단순화로 **세 라우트가 모두 삭제**되어
> App Review Guideline 2.3(부정확한 메타데이터) 위반 상태였다. 실제 기능만 남기도록 재작성.
> 앱 **이름은 바꾸지 않는다** — 4.3(b) 리젝(2026-05-22) 을 캐릭터 IP 포지셔닝으로 통과했기 때문에,
> 이름을 사주 키워드로 바꾸면 그 근거가 무너진다. 사주 키워드는 부제·키워드 필드로만 태운다.

- **이름** (≤30자): `꼬북점: 나의 AI 거북이`  ← 변경 금지
- **부제** (≤30자): `매일 무료 운세와 내 일주 카드`
- **프로모션 텍스트** (≤170자, 심사 없이 교체 가능):
  `매일 무료로 여는 오늘의 운세와, 60종 중 하나인 내 일주 캐릭터 카드. 내 사주를 아는 꼬북이와 대화로 이어가 보세요.`
- **키워드** (≤100자, 쉼표구분/공백없이):
  `거북이,캐릭터,오늘운세,일주,60갑자,성격유형,자기이해,심리테스트,사주,사주풀이,만세력,명리,운세앱,오행`
  - ⚠️ `궁합`·`대운`·`길일`·`인연` 제거 — 앱에 없는 기능이라 2.3 리젝 사유이자 유입 후 이탈 요인
- **설명**:
```
꼬북섬에 사는 거북이 꼬북이가 당신의 사주를 읽어드려요.

■ 나를 닮은 캐릭터, 일주 카드
태어난 날로 정해지는 '나의 일주' 캐릭터 카드를 만들어 드려요.
60종 중 하나뿐인 내 카드를 친구에게 공유하고 "넌 무슨 일주야?" 물어보세요.

■ 매일 열어보는 오늘의 거북빵
하루 한 번 무료로 거북빵을 열면 오늘의 흐름, 행운의 색과 숫자,
오늘 해보면 좋은 일이 들어 있어요. 매일 열면 도장이 쌓여요.

■ 내 사주 전체 풀이
사주팔자 여덟 글자와 오행을 근거로, 나라는 사람 · 타고난 강점 ·
조심할 그늘 · 일과 돈 · 사랑과 관계 · 지금의 흐름을 한 편으로 정리해 드려요.

■ 이번 달 흐름
매달 새로 갱신되는 이번 달 운세를 무료 요약으로 확인하고,
더 궁금하면 분야별 상세 풀이로 이어서 볼 수 있어요.

■ 꼬북이와 대화
풀이를 읽고 궁금한 게 생기면 바로 물어보세요.
내 사주를 알고 있는 꼬북이가 이어서 답해줘요.

· 카카오 계정으로 3초 만에 시작할 수 있어요.
· 구독 없이, 필요한 풀이만 골라 볼 수 있어요.
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
- The current app uses Kakao OAuth as its single login method.

We respectfully request a re-review under the updated metadata. If a concern remains, we would welcome the opportunity to discuss it with the App Review Board.

Thank you for your time.
```

---

## ④ 스크린샷 플랜 (6.9" iPhone, 1320 × 2868 px)

iPhone 전용이라 6.9" 한 사이즈만 있으면 됨(iPad 스크린샷 불필요).

> ⚠️ **2026-08-14 갱신.** 이전 플랜의 `/mode`·`/relations`·`/calendar` 는 **삭제된 라우트**라
> 재촬영이 불가능하다. `appstore-shots/` 의 기존 캡처도 그 화면들을 담고 있어 재사용 불가.

| # | 화면 | 캡션(예시) | 라우트 |
|---|------|-----------|--------|
| 1 | 일주 캐릭터 카드 | 태어난 날로 만든 나만의 캐릭터 | `/ilju/[slug]` (공개) |
| 2 | 오늘의 거북빵 | 하루 한 번, 무료로 열어보는 오늘 | `/home` (거북빵 카드) |
| 3 | 내 사주 전체 풀이 | 여덟 글자로 읽는 나라는 사람 | `/shell` |
| 4 | 이번 달 흐름 | 매달 새로 갱신되는 이번 달 운세 | `/home` (이번 달 흐름 카드) |
| 5 | 꼬북이와 대화 | 내 사주를 아는 친구에게 물어보기 | `/chat` |
| 6 | 만세력 등껍질 | 사주 여덟 글자를 한눈에 | `/shell` (등껍질 상단) |

**규칙**
- ❗ **1번(첫 장)에 복잡한 결과표를 두지 말 것** — 캐릭터 카드를 먼저 보여줄 것.
- ❗ 검색 결과에는 첫 1~3장만 노출된다. 1~3번에 핵심을 다 담을 것.
- 캡션은 이미지에 텍스트 오버레이로(스토어가 자동으로 안 넣음).

**캡처 방법 (정확한 해상도)**
- Xcode ▸ 시뮬레이터에서 **iPhone 16 Pro Max(6.9")** 실행 → 로그인 → 화면 이동 → **⌘S**(파일 저장) → 정확히 1320×2868 PNG 저장.
- 또는 실기기(6.9" 모델)에서 캡처.
- ⚠️ 데스크톱 브라우저 창 리사이즈로는 1320×2868 세로 비율이 안 나옴(실측 확인). 시뮬레이터/실기기 권장.

---

## ⑤ 로그인 정책

2026-08-11부터 앱 로그인은 카카오 OAuth 하나만 제공한다. Apple 로그인과 익명
테스트 로그인 코드는 제거했다. iOS App Store 제출 전에는 외부 로그인 서비스에
관한 최신 App Review 정책을 다시 확인한다.

---

## ⑥ 네이티브 변경 사항 (이번 빌드)
- `Info.plist`에 `ITSAppUsesNonExemptEncryption = false` 추가 — 앱은 표준 HTTPS/TLS만 사용(면제) → 업로드 시 암호화 질문 안 뜸.
- 빌드번호 4 → 5.
- 코드/메타 재변경 후 다시 올릴 땐 build **6** 으로 올릴 것(번호 재사용 불가).

## ⑦ 주의 — 결제 (3.1.1 / 4.8)
- iOS 인앱 디지털 재화(꼬북알)는 StoreKit IAP 필요. 카카오페이 웹 결제는 iOS에서 노출 금지.
- 현재 네이티브 앱(iOS)에선 충전 UI를 숨기는 게 안전(웹 전용 결제 유지). 정식 iOS 인앱 매출은 StoreKit 구현 후.
