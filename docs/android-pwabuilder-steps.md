# 꼬북점 — PWABuilder로 구글 플레이 올리기 (초상세 / 그대로 따라하기)

> 이 문서 하나만 보고 순서대로 따라가면 됩니다. 막히면 맨 아래 "문제 해결" 참고.
> 예상 소요: 첫 업로드 1~2시간 (Play Console 계정 승인 대기 별도).

## 📋 복붙용 정보 (전부 이 값 그대로)

| 항목 | 값 |
|---|---|
| 웹 주소(URL) | `https://ggobuk.vercel.app` |
| 패키지 ID(Package ID) | `com.niceverygood.ggobuk` |
| 앱 이름 | `꼬북점` |
| 개인정보처리방침 URL | `https://ggobuk.vercel.app/privacy` |

> ⚠️ **패키지 ID는 한 번 정하면 영원히 못 바꿔요.** 위 값 그대로 쓰세요.

---

## STEP 0. 결제는 무료로 시작 (정책 리스크 0)

Vercel 환경변수 `BETA_FREE_MODE=true` 가 켜져 있는지 확인.
(켜져 있으면 모든 풀이가 무료라 구글 결제 정책에 안 걸림.)

---

## STEP 1. 구글 플레이 개발자 계정 (최초 1회)

1. https://play.google.com/console 접속 → 구글 계정 로그인
2. "개발자 계정 만들기" → **개인** 또는 **조직(사업자)** 선택
   - 사업자(주식회사 바틀)로 낼 거면 **조직** 선택 + 사업자 정보 입력
3. 등록비 **$25** 결제 (1회성, 평생)
4. 신분 확인 (신분증/사업자등록증) — **승인까지 며칠 걸릴 수 있음**. 미리 해두세요.

> 계정 승인 기다리는 동안 STEP 2~4(앱 패키지 만들기)는 먼저 해둬도 됨.

---

## STEP 2. PWABuilder로 안드로이드 패키지 만들기

1. https://www.pwabuilder.com 접속
2. 가운데 입력칸에 `https://ggobuk.vercel.app` 입력 → **Start / Analyze** 클릭
3. 잠시 분석 후 점수 화면이 나옴 (Manifest / Service Worker / Security 체크).
   - 빨간 항목 있어도 대부분 진행 가능. **Package For Stores** 버튼 클릭.
4. 스토어 목록에서 **Android** 카드의 **Generate Package** (또는 Store Package) 클릭
5. 안드로이드 옵션 창이 뜸. 아래대로 입력:

   | 필드 | 입력값 |
   |---|---|
   | Package ID | `com.niceverygood.ggobuk` |
   | App name | `꼬북점` |
   | Launcher name | `꼬북점` (12자 이내) |
   | App version | `1.0.0` |
   | App version code | `1` |
   | Signing key | **"Create New"** 선택 (PWABuilder가 키 생성 — 가장 쉬움) |

   - **Signing key 를 꼭 "Create New"** 로. (직접 keystore 만들 필요 없음)
   - 나머지 고급 옵션(Splash, Status bar 색 등)은 기본값 두면 됨.
6. **Download / Generate** 클릭 → `ggobuk.zip` (또는 비슷한 이름) 다운로드

---

## STEP 3. zip 내용 확인 (중요한 파일들)

다운받은 zip 을 풀면 보통 이런 게 들어 있음:

| 파일 | 용도 |
|---|---|
| `*.aab` | **구글 플레이 업로드용** (이걸 올림) |
| `*.apk` | 폰에 직접 설치해 테스트용 |
| `signing.keystore` | **서명 키 — 절대 분실 금지! 안전 백업** |
| `signing-key-info.txt` | keystore 비밀번호·alias·**SHA256 지문** 들어있음 |
| `assetlinks.json` | Digital Asset Links (SHA256 포함) |
| `next-steps.html` | PWABuilder 안내 |

> ❗ `signing.keystore` + `signing-key-info.txt` 를 **클라우드·비밀번호 관리자에 백업**.
> 잃어버리면 (Play App Signing 안 쓸 경우) 앱 업데이트를 영영 못 합니다.

---

## STEP 4. assetlinks.json 지문 교체 → git push

TWA 가 **주소창 없이 풀스크린**으로 뜨려면, 우리 웹에 "이 앱은 내 거다"를
증명하는 파일이 있어야 함. 이미 `public/.well-known/assetlinks.json` 에
placeholder 를 깔아뒀으니 지문만 바꾸면 됨.

1. `signing-key-info.txt` (또는 zip 의 `assetlinks.json`) 를 열어
   **SHA256 Fingerprint** 를 복사. 이렇게 생김:
   ```
   AB:CD:12:34:....:EF   (콜론 포함 64자리 16진수)
   ```
2. 프로젝트의 `public/.well-known/assetlinks.json` 을 열어
   `REPLACE_WITH_SHA256_FINGERPRINT_FROM_PLAY_APP_SIGNING` 부분을
   복사한 지문으로 교체.
3. 커밋 + 푸시:
   ```bash
   git add public/.well-known/assetlinks.json
   git commit -m "chore: assetlinks SHA256 지문 등록 (TWA)"
   git push origin main
   ```
4. 배포 후 브라우저에서 확인:
   `https://ggobuk.vercel.app/.well-known/assetlinks.json`
   → 방금 넣은 지문이 보이면 OK.

> ⚠️ **함정**: STEP 6 에서 Play Console "Play App Signing" 을 켜면 구글이
> **별도의 최종 서명 지문**을 만듭니다. 그 경우 위 PWABuilder 지문 + 구글이
> 준 지문 **둘 다** assetlinks 에 넣어야 주소창이 사라집니다. (STEP 6-끝 참고)

---

## STEP 5. (선택) 폰에 .apk 직접 설치해 미리 보기

Play Console 올리기 전 빠른 확인:
1. zip 의 `.apk` 를 안드로이드 폰으로 전송 (카톡 나에게 보내기 등)
2. 폰에서 열기 → "출처를 알 수 없는 앱" 허용 → 설치
3. 꼬북점이 앱으로 뜨면 성공 (이땐 주소창 보일 수 있음 — assetlinks 배포 전이라 정상)

---

## STEP 6. 구글 플레이 콘솔에 앱 등록 + .aab 업로드

1. https://play.google.com/console → **앱 만들기**
   - 앱 이름: `꼬북점` / 기본 언어: 한국어 / 앱 / 무료
   - 선언 체크 2개 동의 → 앱 만들기
2. 좌측 메뉴 **테스트 → 내부 테스트** → **새 버전 만들기**
3. **App Bundle 업로드** 에 zip 의 `.aab` 드래그
   - 이때 "Play 앱 서명(Play App Signing)" 사용 안내가 뜨면 **사용 설정** (권장).
4. 출시명(예: `1.0.0`)·출시 노트 입력 → 저장 → 검토 → 출시 시작
5. 좌측 **앱 콘텐츠(대시보드의 작업)** 를 전부 작성 (모두 ✅ 돼야 게시 가능):
   - **개인정보처리방침**: `https://ggobuk.vercel.app/privacy`
   - **앱 액세스 권한**: 로그인 필요 → "전체 또는 일부 기능 제한됨" → 테스트
     계정 제공 (로그인 화면의 "테스트 로그인(익명)" 버튼 안내 적기)
   - **광고**: 없으면 "아니요"
   - **콘텐츠 등급**: 설문 작성 (사주/운세 → 보통 전체이용가)
   - **타겟층 및 콘텐츠**: 만 18세 이상 등 (매칭 기능 고려 시 성인 권장)
   - **데이터 보안**: 수집=이름·생년월일·기기ID·사용데이터 / 전송 암호화 /
     삭제 요청 가능 → **privacy 페이지와 똑같이** 작성 (불일치 시 거부)
6. **스토어 등록정보(좌측 메뉴 → 기본 스토어 등록정보)**:
   - 앱 이름: 꼬북점
   - 간단한 설명(80자): 예) "등껍질을 두드리면 답이 나온다 — AI 사주·궁합·운세"
   - 자세한 설명: 기능 나열 (사주 8자, 12가지 풀이, 4가지 페르소나, 궁합,
     대운 타임라인, 사주 웹툰, 매일 운세 등) — 웹뷰 거부 회피에 도움
   - 앱 아이콘 512×512: `public/icons/icon-512.png`
   - 그래픽 이미지(피처) 1024×500: 직접 제작 (Canva 등)
   - 스마트폰 스크린샷 2장 이상: `assets/app-store/` 의 iPhone 컷 재활용 가능

### 6-끝. Play App Signing 지문 추가 (주소창 없애기 마무리)
1. 좌측 **설정 → 앱 서명(App Signing)** 들어가기
2. **앱 서명 키 인증서 → SHA-256 인증서 지문** 복사
3. `public/.well-known/assetlinks.json` 의 배열에 이 지문을 **추가**
   (PWABuilder 지문과 함께 2개가 되도록):
   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.niceverygood.ggobuk",
         "sha256_cert_fingerprints": [
           "PWABuilder가_준_지문",
           "PlayAppSigning_지문"
         ]
       }
     }
   ]
   ```
4. git push → 재배포. 이제 앱에서 주소창이 사라짐.

---

## STEP 7. 내부 테스트 설치 → 단계 승격

1. 내부 테스트 페이지의 **테스터** 에 본인 구글 이메일 추가
2. **테스트 링크 복사** → 폰 크롬에서 열기 → "테스터 참여" → 플레이스토어 설치
3. 앱 실행해 정상 동작·주소창 없음 확인
4. 문제 없으면 좌측 **비공개 테스트 → 프로덕션** 순으로 승격
   (프로덕션 첫 제출은 구글 심사 며칠 소요)

---

## 🛠 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| 앱에 **주소창이 보임** | assetlinks 지문 불일치. STEP 6-끝의 Play App Signing 지문을 추가했는지 확인. `https://ggobuk.vercel.app/.well-known/assetlinks.json` 가 200 으로 열리는지 확인. |
| 업로드 시 "이미 사용 중인 패키지 이름" | 패키지 ID 중복. `com.niceverygood.ggobuk` 가 본인 다른 앱과 안 겹치는지. |
| 심사 거부 "최소 기능/웹뷰" | 스토어 설명에 기능 풍부하게 명시, 푸시·공유 등 강조. 테스트 로그인 버튼 안내. |
| "데이터 보안 불일치" 거부 | Play Console 데이터보안 양식을 /privacy 내용과 정확히 일치시키기. |
| 인터넷 끊기면 빈 화면 | OfflineGuard 가 안내 오버레이 표시 (이미 구현됨). |

---

## ✅ 최종 체크리스트

- [ ] BETA_FREE_MODE=true 확인
- [ ] Play Console 개발자 등록($25) + 신분 확인
- [ ] PWABuilder 에서 .aab 생성 (Package ID = com.niceverygood.ggobuk)
- [ ] signing.keystore + 비번 안전 백업
- [ ] assetlinks.json 에 PWABuilder 지문 교체 + push
- [ ] Play Console 내부 테스트에 .aab 업로드
- [ ] 앱 콘텐츠(개인정보·데이터보안·콘텐츠등급·타겟층) 전부 작성
- [ ] 스토어 등록정보(아이콘·피처·스크린샷·설명)
- [ ] Play App Signing 지문 assetlinks 에 추가 + push (주소창 제거)
- [ ] 내부 테스트 설치 확인 → 프로덕션 제출
