# 꼬북점 — 구글 플레이 스토어 업로드 가이드

> 그대로 따라 하면 됩니다. 꼬북점은 Capacitor + 원격 로드(server.url) 방식이라
> 웹 빌드를 따로 번들하지 않고 https://ggobuk.vercel.app 를 그대로 띄웁니다.
> iOS 와 동일한 구조(앱 = 네이티브 쉘, 내용 = 웹).

앱 식별자: `com.niceverygood.ggobuk` · 앱 이름: 꼬북점

---

## ⚠️ 시작 전 꼭 알아야 할 것 (결제 정책)

꼬북점은 사주 풀이·꼬북알 같은 **디지털 콘텐츠**를 판다. 구글 플레이는
디지털 콘텐츠 결제에 **구글 플레이 결제(Google Play Billing)** 사용을 원칙으로
요구한다. 카카오페이 단건결제만 쓰면 **정책 위반으로 앱이 정지될 수 있다.**

- 한국은 「인앱결제 강제 금지법(전기통신사업법 개정)」으로 **제3자 결제(외부결제)**
  를 허용하지만, 구글은 여전히 고지·수수료·등록 요건을 둔다.
- **현실적 선택지 3가지**:
  1. 출시 초기엔 **BETA_FREE_MODE 로 결제 없이** 무료 운영 → 정책 리스크 0.
  2. 구글 플레이 결제(Play Billing) 연동 (수수료 15~30%).
  3. 외부결제(카카오페이) + 한국 외부결제 고지 요건 준수 (정책·법무 검토 필수).
- ❗ **권장**: 출시 v1 은 무료(BETA) 또는 Play Billing. 카카오페이 단독은 변호사
  검토 전까지 보류.

---

## 0. 사전 준비물

- [ ] **Google Play Console 개발자 계정** — https://play.google.com/console
      (최초 1회 **$25** 등록비, 신분 확인 필요, 며칠 걸릴 수 있음)
- [ ] **Android Studio** 설치 — https://developer.android.com/studio
- [ ] **JDK 17** (Android Studio 에 보통 포함)
- [ ] 앱 아이콘 512×512 PNG — `public/icons/icon-512.png` 사용
- [ ] 피처 그래픽 1024×500 PNG (스토어 상단 배너)
- [ ] 스크린샷 최소 2장 (폰 기준, 권장 1080×1920 안팎) — `assets/app-store/` 의
      iPhone 스크린샷 재활용 또는 안드로이드로 재촬영

---

## 1. Capacitor 에 Android 플랫폼 추가

프로젝트 루트(`kkobukjeom/`)에서:

```bash
# 1) Android 패키지 추가
pnpm add @capacitor/android

# 2) Android 네이티브 프로젝트 생성 (android/ 폴더 생김)
npx cap add android

# 3) 설정 동기화 (capacitor.config.ts 의 server.url·allowNavigation 반영)
npx cap sync android
```

> server.url 방식이라 `next build` 결과를 넣지 않는다. webDir(app-shell)은
> 스플래시·폴백용 최소 쉘이고 실제 화면은 원격(ggobuk.vercel.app)에서 로드된다.

---

## 2. 앱 아이콘·이름 적용

```bash
# Android Studio 로 열기
npx cap open android
```

Android Studio 에서:
1. 좌측 프로젝트 뷰 → `android/app/src/main/res` 폴더 우클릭
2. **New → Image Asset** → Icon Type: Launcher Icons
3. Foreground 에 `public/icons/icon-512.png` (또는 maskable) 지정 → Next → Finish
4. `android/app/src/main/res/values/strings.xml` 의 `app_name` 이 "꼬북점" 인지 확인
   (capacitor.config.ts 의 appName 에서 자동 설정됨)

---

## 3. 서명 키(keystore) 생성 — 한 번만, 절대 분실 금지

```bash
# 홈 디렉토리 등 안전한 곳에서
keytool -genkey -v \
  -keystore ggobuk-upload.keystore \
  -alias ggobuk \
  -keyalg RSA -keysize 2048 -validity 10000
```

- 비밀번호·이름 입력 프롬프트가 뜬다. **비밀번호를 안전하게 기록**.
- ⚠️ 이 keystore 를 잃어버리면 **앱 업데이트를 영영 못 한다**. 백업 필수.
  (단, 아래 5단계에서 **Play App Signing** 을 켜면 구글이 최종 서명키를
   관리하고 이 keystore 는 "업로드 키" 역할만 → 분실해도 재설정 가능. 권장.)

`android/app` 에 `keystore.properties` 생성:
```properties
storeFile=/Users/본인경로/ggobuk-upload.keystore
storePassword=설정한_비번
keyAlias=ggobuk
keyPassword=설정한_비번
```
그리고 `android/app/build.gradle` 에 서명 설정 추가 (Android Studio 가 안내하는
표준 signingConfigs 블록). 자세한 표준 코드는 6단계 참고.

---

## 4. AAB(앱 번들) 빌드

Android Studio 상단 메뉴:
1. **Build → Generate Signed Bundle / APK**
2. **Android App Bundle (.aab)** 선택 → Next
3. 3단계에서 만든 keystore 선택 + 비밀번호 입력
4. Build variant: **release** → Finish
5. 완료되면 `android/app/release/app-release.aab` 생성

> 또는 터미널: `cd android && ./gradlew bundleRelease`

---

## 5. Play Console 에 앱 등록

https://play.google.com/console → **앱 만들기**

1. 앱 이름: 꼬북점 / 기본 언어: 한국어 / 앱 또는 게임: 앱 / 무료 또는 유료: 무료
2. 좌측 메뉴 순서대로 작성 (모두 ✅ 되어야 출시 가능):
   - **앱 콘텐츠** → 개인정보처리방침 URL: `https://ggobuk.vercel.app/privacy`
   - **앱 액세스 권한** → 로그인 필요 시 테스트 계정 제공 (테스트 로그인 버튼 안내)
   - **광고** → 광고 포함 여부 (없으면 '아니요')
   - **콘텐츠 등급** → 설문 작성 (사주/운세는 보통 전체이용가)
   - **타겟층 및 콘텐츠** → 만 14세 이상 등 연령 설정
   - **데이터 보안(Data Safety)** → 수집 데이터 신고:
     · 수집: 이름, 생년월일, 기기 식별자, 사용 데이터
     · 목적: 앱 기능 / 전송 암호화됨 / 삭제 요청 가능
     · privacy 페이지 내용과 일치시킬 것
3. **Play App Signing** → 사용 설정 (구글이 최종 서명키 관리, 권장)

---

## 6. AAB 업로드 + 테스트 트랙

처음부터 프로덕션 말고 **내부 테스트**부터:

1. 좌측 **테스트 → 내부 테스트** → 새 버전 만들기
2. 3단계에서 만든 **app-release.aab** 업로드
3. 출시명·출시 노트 작성
4. 테스터 이메일 목록 추가 (본인 + 지인)
5. 검토 → 출시 → 며칠 내 심사
6. 내부 테스트 링크로 본인 폰에 설치해 동작 확인
7. 문제 없으면 **비공개 테스트 → 프로덕션** 순으로 승격

---

## 7. 심사 통과 팁 (iOS 4.3b 거부 경험 반영)

- **단순 웹뷰 거부 주의**: 구글도 "최소 기능 정책"이 있다. server.url 웹뷰
  래퍼는 종종 "기능이 부족하다"고 거부된다. 대응:
  · 푸시 알림(이미 구현), 오프라인 스플래시, 네이티브 공유 등 네이티브 가치 강조
  · 스토어 설명에 "사주 계산·AI 풀이·궁합·웹툰" 등 풍부한 기능 명시
  · 정 안 되면 **TWA(Trusted Web Activity)** 로 전환 (Digital Asset Links 로
    "내 PWA 의 신뢰된 래퍼"임을 구글에 입증 — 웹뷰 거부 회피에 가장 안전)
- **개인정보·데이터 안전 양식**을 privacy 페이지와 100% 일치시킬 것 (불일치 거부 사유)
- **로그인 벽**: 심사자가 내용을 못 보면 거부 → 테스트 로그인(익명) 버튼 유지

---

## 대안 경로 — TWA(PWABuilder) — 더 쉽고 거부 적음

Capacitor 대신 PWA 를 그대로 패키징하는 가장 쉬운 길:

1. https://www.pwabuilder.com 접속
2. `https://ggobuk.vercel.app` 입력 → Analyze
3. **Package for stores → Android** → 옵션 확인 후 **Generate**
4. 받은 zip 에 .aab + `assetlinks.json` + 서명 가이드 포함
5. `assetlinks.json` 을 `https://ggobuk.vercel.app/.well-known/assetlinks.json`
   에 배포 (public/.well-known/ 에 넣으면 됨) → 주소창 없는 풀스크린 TWA 완성
6. .aab 를 5~6단계대로 Play Console 업로드

> TWA 는 구글이 공식 지원하는 PWA 패키징이라 "웹뷰 래퍼" 거부 리스크가 가장 낮다.
> 단 Capacitor 의 네이티브 플러그인(향후 추가 시)은 못 쓴다.

---

## 빠른 체크리스트

- [ ] Play Console 개발자 등록($25) 완료
- [ ] `pnpm add @capacitor/android && npx cap add android && npx cap sync android`
- [ ] 아이콘·앱이름 확인
- [ ] keystore 생성 + 안전 백업 (또는 Play App Signing)
- [ ] AAB 빌드
- [ ] 스토어 등록정보(아이콘·피처그래픽·스크린샷·설명)
- [ ] 개인정보처리방침 URL = https://ggobuk.vercel.app/privacy
- [ ] 데이터 보안 양식 (privacy 와 일치)
- [ ] 콘텐츠 등급·타겟층
- [ ] 결제 정책 결정 (무료 / Play Billing / 외부결제 검토)
- [ ] 내부 테스트 → 비공개 → 프로덕션
