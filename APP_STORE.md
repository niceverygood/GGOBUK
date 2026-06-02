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
- **부제** (≤30자): `성격 다른 거북이 4마리와의 대화`
- **프로모션 텍스트** (≤170자): `오늘은 어떤 거북이랑 얘기해볼래? 꼬북섬의 네 마리가 너를 기다려.`
- **키워드** (≤100자, 쉼표구분/공백없이): `거북이,캐릭터,AI친구,챗봇,대화,일주,성격유형,자기이해,궁합,인연,심리테스트,캐릭터수집,사주,명리`
- **설명**:
```
꼬북섬에는 성격이 제각각인 거북이 네 마리가 살아요.

🐢 꼬북이 — 편하게 수다 떠는 친구
🧙 꼬북도사 — 점잖게 조언하는 할아버지
🔮 꼬북무당 — 돌직구 날리는 MZ 무당
🙏 꼬북보살 — 따뜻하게 다독여 주는 보살

네 마리는 모두 같은 거북이지만 말투도 시선도 완전히 달라요.
오늘 기분에 맞는 거북이를 골라 대화를 시작해 보세요.

■ 나를 닮은 캐릭터, 일주 카드
태어난 날로 정해지는 '나의 일주' 캐릭터 카드를 만들어 드려요.
60종 중 하나뿐인 내 카드를 친구에게 공유하고 "넌 무슨 일주야?" 물어보세요.

■ 기억하는 AI 대화
거북이들은 지난 대화를 기억해요. 이야기를 나눌수록 나를 더 잘 아는 친구가 됩니다.

■ 친구와의 궁합
링크 하나로 친구를 초대하면 둘의 캐릭터가 얼마나 잘 맞는지 보여드려요.

■ 오늘의 흐름
매일, 오늘 하루를 어떻게 보내면 좋을지 짧은 가이드를 받아보세요.

· 구독 없이 시작할 수 있어요.
· 사주·명리를 모티프로 한 엔터테인먼트 콘텐츠입니다. 재미로 즐겨주세요.
```

### English (en-US)
- **Name** (≤30): `Kkobukjeom: My AI Turtles`
- **Subtitle** (≤30): `Chat with 4 turtle characters`
- **Promotional text** (≤170): `Which turtle do you feel like talking to today? Four characters on Kkobuk Island are waiting for you.`
- **Keywords** (≤100): `turtle,character,AI friend,chatbot,companion,personality,self-discovery,compatibility,quiz,collect,daily,zodiac`
- **Description**:
```
Four turtles with very different personalities live on Kkobuk Island.

🐢 Kkobuk — your easygoing chatty friend
🧙 Dosa — the calm, wise grandfather
🔮 Mudang — the blunt, no-filter shaman
🙏 Bosal — the warm, comforting one

They're all the same turtle, but each speaks and sees the world differently.
Pick the one that fits your mood and start a conversation.

■ A character that's you — your Ilju card
Get a one-of-60 character identity card based on your birth date.
Share it with friends and ask, "Which one are you?"

■ AI chats that remember
The turtles remember past conversations. The more you talk, the better they know you.

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

Kkobukjeom is an original-character AI companion app set on "Kkobuk Island," home to four turtle characters we designed and wrote in-house. Each turtle has a distinct personality and speaking style, and users chat with them in a conversational AI experience that remembers past conversations.

The app is meaningfully different from a generic template:
1. Original IP — the four turtle characters, their artwork, and their world are our own original creations, not a reskinned template.
2. Conversational AI with persistent memory — users have ongoing, personalized conversations that develop over time.
3. Personality identity cards — each user receives a collectible character card based on their birth data (a "16Personalities-style" identity) that is designed to be shared.
4. Social compatibility — users invite friends with a link to see how their characters match.

We have updated the listing to reflect this:
- Primary category changed to Entertainment (secondary: Lifestyle).
- Name, subtitle, description, keywords, and screenshots now lead with the characters and the conversational experience.
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
| 1 | 캐릭터 선택 | 성격 다른 네 마리, 오늘은 누구랑? | `/mode` 또는 `/persona` |
| 2 | 대화(채팅) | 기억하는 AI 친구와 수다 | `/chat` |
| 3 | 일주 캐릭터 카드 | 태어난 날로 만든 나만의 캐릭터 | `/ilju/[slug]` (공개) |
| 4 | 친구 궁합 | 우린 얼마나 잘 맞을까? | `/people` 또는 `/relations` |
| 5 | 오늘의 흐름 | 오늘 하루, 이렇게 보내봐 | `/home` (오늘의 흐름 카드) |
| 6 | 운세 달력 | 한 달의 흐름을 한눈에 | `/calendar` |

**규칙**
- ❗ **1번(첫 장)에 운세 결과표/점괘를 두지 말 것** — 4.3 트리거. 반드시 캐릭터·대화 화면을 앞에.
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
   - Domains: `ggobuk.vercel.app`, `<project-ref>.supabase.co`
   - Return URLs: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Keys ▸ `+` ▸ Sign in with Apple 활성 ▸ 생성 ▸ **.p8 키 다운로드(1회뿐)** + **Key ID** 기록 (Team ID = `7AXRWTV5YW`).

### Supabase (Dashboard ▸ Authentication ▸ Providers ▸ Apple)
- Apple 활성화
- Client ID (Services ID) = `com.niceverygood.ggobuk.web`
- Team ID = `7AXRWTV5YW`
- Key ID = (위 키)
- Private key = `.p8` 파일 내용 전체
- Save
- Authentication ▸ URL Configuration: Site URL `https://ggobuk.vercel.app`, redirect 허용목록에 `https://ggobuk.vercel.app/callback` 포함 확인.

> `<project-ref>`는 Vercel 환경변수 `NEXT_PUBLIC_SUPABASE_URL`(`https://<project-ref>.supabase.co`)에서 확인.

---

## ⑥ 네이티브 변경 사항 (이번 빌드)
- `Info.plist`에 `ITSAppUsesNonExemptEncryption = false` 추가 — 앱은 표준 HTTPS/TLS만 사용(면제) → 업로드 시 암호화 질문 안 뜸.
- 빌드번호 4 → 5.
- 코드/메타 재변경 후 다시 올릴 땐 build **6** 으로 올릴 것(번호 재사용 불가).

## ⑦ 주의 — 결제 (3.1.1 / 4.8)
- iOS 인앱 디지털 재화(꼬북알)는 StoreKit IAP 필요. 카카오페이 웹 결제는 iOS에서 노출 금지.
- 현재 네이티브 앱(iOS)에선 충전 UI를 숨기는 게 안전(웹 전용 결제 유지). 정식 iOS 인앱 매출은 StoreKit 구현 후.
