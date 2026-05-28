# Apple Sign-In 설정 가이드

App Store 4.8 대응. 카카오 외 동등한 로그인 옵션으로 Apple Sign-In을 도입한다.
코드 변경은 끝났고, **Apple Developer Console + Supabase Dashboard에서 직접 설정해야 동작한다.**

---

## 1. Apple Developer Console — Identifier & Services ID

### 1.1 App ID에 Sign In with Apple capability 추가
1. https://developer.apple.com → Certificates, Identifiers & Profiles → Identifiers
2. `com.niceverygood.ggobuk` (꼬북점 iOS App ID) 선택
3. "Sign In with Apple" 체크 → Save

### 1.2 Services ID 생성 (웹 OAuth 콜백용)
Supabase OAuth는 Services ID를 client_id로 사용한다.
1. Identifiers → "+" → **Services IDs** → Continue
2. Description: `KkobukJeom Web Sign-In`
3. Identifier: `com.niceverygood.ggobuk.web` (App ID와 달라야 함)
4. Continue → Register
5. 만들어진 Services ID 클릭 → "Sign In with Apple" 체크 → Configure
6. Primary App ID: `com.niceverygood.ggobuk` 선택
7. Domains and Subdomains:
   ```
   ggobuk.vercel.app
   <supabase-project-ref>.supabase.co
   ```
8. Return URLs:
   ```
   https://<supabase-project-ref>.supabase.co/auth/v1/callback
   ```
9. Save

### 1.3 Key 생성 (Sign In with Apple private key)
1. Keys → "+" → Key Name: `Apple Sign-In Key for KkobukJeom`
2. "Sign In with Apple" 체크 → Configure → Primary App ID = `com.niceverygood.ggobuk`
3. Continue → Register
4. **`.p8` 파일 다운로드** (한 번만 받을 수 있음. 안전하게 보관)
5. Key ID (10자) 메모

### 1.4 Team ID 확인
- Apple Developer 우측 상단 멤버십 → Team ID (10자)

---

## 2. Supabase Dashboard — Apple Provider

1. Supabase Dashboard → Authentication → Providers → Apple
2. **Enable Apple provider** ON
3. 입력:
   - **Services ID** (1.2의 `com.niceverygood.ggobuk.web`)
   - **Team ID** (1.4)
   - **Key ID** (1.3)
   - **Secret Key** — `.p8` 파일 내용 전체 (BEGIN/END 줄 포함) 붙여넣기
4. **Authorized Client IDs**: `com.niceverygood.ggobuk` (네이티브 앱 ID도 추가하면 추후 native flow 사용 가능)
5. Save

---

## 3. 동작 검증

1. 로컬: `pnpm dev` → `/login` → "Apple로 계속하기" → Apple ID 로그인 → `/home` 진입
2. 콜백 URL이 `/callback?next=/home&provider=apple`로 떨어지는지 확인
3. Supabase Dashboard → Authentication → Users → 새 사용자 행에 `app_metadata.provider = apple` 확인
4. `public.users` 행 자동 upsert 됐는지 확인 (`kakao_id`는 NULL, `nickname`은 Apple이 준 표시이름 또는 NULL)

---

## 4. iOS App 측 (옵션 — Web OAuth로도 4.8 충족)

현재 구현은 **Capacitor WebView에서 Supabase Apple OAuth → appleid.apple.com 리다이렉트**. 이미 4.8 요구사항(이름·이메일만 수집, 이메일 가리기 옵션, 광고 추적 없음)을 모두 만족한다.

향후 **네이티브 Sign In with Apple 시트**로 업그레이드하려면:

```bash
pnpm add @capacitor-community/apple-sign-in
pnpm cap sync ios
```

그 후 `App/App.entitlements`에 `com.apple.developer.applesignin` 추가하고 Xcode → Signing & Capabilities → "+ Capability" → Sign In with Apple 추가.

지금은 web OAuth 만으로도 App Store 통과 가능. 출시 후 UX 개선용으로 미뤄도 됨.

---

## 5. App Store Connect 안내 사항

App Information → App Review Information 에 추가:

> The app offers two sign-in options:
> 1. **Sign in with Apple** — meets all 4.8 requirements (name/email only, hide-email supported, no ad tracking).
> 2. **Kakao Login** — primary login for Korean market.
>
> Both are presented with equivalent visual weight on the login screen.

---

## 6. 환경변수 / 추가 작업

- 없음 (모든 Apple secret은 Supabase에 저장).
- Vercel 재배포 불필요 (CSP는 코드로 이미 반영).
