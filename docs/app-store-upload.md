# 꼬북점 iOS 앱스토어 업로드 준비서

## 현재 패키징 방식

- iOS 번들 ID: `com.niceverygood.ggobuk`
- 앱 이름: `꼬북점`
- 네이티브 패키징: Capacitor iOS
- 앱 내부 URL: `https://ggobuk.vercel.app`
- 개인정보 처리방침 URL: `https://ggobuk.vercel.app/privacy`
- 이용약관 URL: `https://ggobuk.vercel.app/terms`

Next.js 서버 API, Supabase, OpenRouter/OpenAI, 카카오 로그인/결제가 이미 서버에 붙어 있으므로 정적 export가 아니라 Vercel 운영 웹앱을 iOS WebView로 여는 구조입니다.

## 최초 1회 준비

```bash
pnpm install
pnpm run app:ios:add
```

`ios/` 폴더가 이미 커밋되어 있으면 `app:ios:add`는 다시 실행하지 않아도 됩니다.

## 업로드용 빌드 갱신

```bash
pnpm run app:ios:prepare
pnpm run app:ios:open
```

Xcode가 열리면 다음 순서로 진행합니다.

1. `App` 타깃을 선택합니다.
2. `Signing & Capabilities`에서 Apple Developer Team을 선택합니다.
3. Bundle Identifier가 `com.niceverygood.ggobuk`인지 확인합니다.
4. `Product > Archive`를 실행합니다.
5. Organizer에서 `Distribute App > App Store Connect`로 업로드합니다.

처음 Xcode를 열면 Capacitor Swift Package를 내려받느라 `Resolve Package Graph` 단계가 몇 분 걸릴 수 있습니다. 네트워크가 안정적인 환경에서 한 번만 완료하면 됩니다.

## App Store Connect에 필요한 값

- 앱 이름: `꼬북점`
- 카테고리: `Lifestyle` 또는 `Entertainment`
- 지원 URL: `https://ggobuk.vercel.app`
- 개인정보 처리방침 URL: `https://ggobuk.vercel.app/privacy`
- 마케팅 URL: `https://ggobuk.vercel.app`
- 로그인 방식: 카카오 로그인, 테스트 로그인
- 심사용 테스트 계정: 테스트 로그인 버튼 사용 가능하다고 Review Notes에 기재

## 심사 전에 꼭 확인할 것

- Vercel Production 환경변수 최신 배포 반영
- Supabase Auth Site URL: `https://ggobuk.vercel.app`
- Supabase Redirect URL:
  - `https://ggobuk.vercel.app/callback`
  - `http://localhost:3000/callback`
- Kakao Developers Redirect URI:
  - `https://zaifbeulgqmhzeewkbtd.supabase.co/auth/v1/callback`
- 앱스토어 스크린샷: iPhone 6.7형, 6.5형, 5.5형 권장
- 앱 개인정보: 생년월일시, 성별, 관계 정보, 결제 정보, 사용 기록 수집 여부를 실제 구현과 맞춰 입력

## 결제 관련 주의

현재 꼬북알 구매는 카카오페이 기반입니다. iOS 앱스토어에서 앱 안의 디지털 콘텐츠/크레딧을 판매하려면 Apple In-App Purchase가 필요할 수 있습니다. TestFlight 업로드는 가능하지만, 정식 심사 제출 전에는 다음 중 하나를 선택하는 것이 안전합니다.

1. iOS 앱에서는 꼬북알 구매를 Apple In-App Purchase로 전환
2. iOS 앱에서는 외부 결제 버튼을 숨기고 웹에서만 구매 제공
3. Apple 심사 노트에 결제 구조와 사용처를 명확히 설명한 뒤 심사 결과 확인

가장 안정적인 정식 출시 경로는 1번입니다.

참고:

- Apple App Review Guidelines 3.1.1 In-App Purchase: https://developer.apple.com/app-store/review/guidelines/#in-app-purchase
- App Store Connect 빌드 업로드: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/

## 직원 GitHub 초대

직원 GitHub ID를 받은 뒤 GitHub 웹에서 초대합니다.

1. `https://github.com/niceverygood/GGOBUK` 접속
2. `Settings > Collaborators and teams`
3. `Add people`
4. 직원 GitHub ID 입력
5. 권한은 앱스토어 업로드 담당이면 `Write`, 배포/설정까지 맡기면 `Maintain`

CLI로 처리할 경우 owner 권한이 있는 계정에서 아래처럼 실행합니다.

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/niceverygood/GGOBUK/collaborators/GITHUB_ID \
  -f permission=write
```

`GITHUB_ID`만 실제 직원 ID로 바꾸면 됩니다.
