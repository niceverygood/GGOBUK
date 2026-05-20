# iOS 빌드 & App Store 제출 가이드

## 사전 준비 (완료)

- [x] iOS 결제 UI 숨김 (Apple IAP 대응)
- [x] Kakao 웹훅 서명 검증
- [x] 테스트 엔드포인트 프로덕션 차단
- [x] Rate Limiting (6개 API)
- [x] CSP/보안 헤더
- [x] Logger (Sentry/PostHog ready)
- [x] Vercel Cron (매일 07:00 KST 일일운세)
- [x] Vercel 환경변수 세팅
- [x] Vercel 배포 완료

## Mac에서 실행할 명령어

```bash
# 1. 레포 클론
git clone https://github.com/niceverygood/GGOBUK.git
cd GGOBUK

# 2. 의존성 설치
pnpm install

# 3. iOS 빌드 준비 (build + asset resize + capacitor sync)
pnpm run app:ios:prepare

# 4. Xcode 열기
pnpm run app:ios:open
```

## Xcode에서 할 일

1. **좌측 패널** → App 프로젝트 선택
2. **Signing & Capabilities** 탭
   - Team: Apple Developer 계정 선택
   - Bundle Identifier: `com.niceverygood.ggobuk` (확인만)
3. **General** 탭
   - Display Name: `꼬북점`
   - Version: `1.0.0`
   - Build: `1`
4. **빌드 타겟** → 상단 드롭다운에서 `Any iOS Device (arm64)` 선택
5. **Product → Archive** (빌드 시작)
6. Archive 완료 → **Window → Organizer** 자동 열림
7. **Distribute App** → **App Store Connect** → Upload

## App Store Connect 메타데이터

### 기본 정보
- **앱 이름**: 꼬북점
- **부제목**: 등껍질이 풀어주는 사주
- **카테고리**: 라이프스타일 (주) / 엔터테인먼트 (부)
- **언어**: 한국어

### 설명 (예시)
```
꼬북점은 정밀한 사주팔자 분석을 바탕으로 당신의 운세를 풀어주는 AI 사주 앱입니다.

주요 기능:
- 사주팔자 정밀 분석 (연/월/일/시주)
- 4가지 페르소나 AI 상담 (친구/도사/무당/보살)
- 대운 타임라인으로 인생 흐름 보기
- 궁합 분석
- 매일 아침 한 줄 운세
- AI 마음부적 이미지 생성
- 길일 찾기

가입만 하면 30꼬북알을 드려요. 무료로 체험해보세요!
```

### 스크린샷
- **6.7인치** (iPhone 15 Pro Max): 필수
- **6.5인치** (iPhone 14 Plus): 필수
- **5.5인치** (iPhone 8 Plus): 필수

Xcode Simulator에서 캡처:
1. 홈 화면 (일일운세)
2. 등껍질 해석 화면
3. 채팅 화면
4. 대운 타임라인
5. 궁합 결과

### 개인정보 수집 선언
- **생년월일** (Date of Birth) — 사주 계산용
- **성별** (Gender) — 사주 계산용
- **이름** (Name) — 프로필 표시용
- **결제내역** (Purchase History) — 크레딧 구매 기록

### Review Notes
```
테스트 방법:
1. 앱 실행 → 로그인 화면의 "테스트 로그인" 버튼 탭
2. 자동으로 테스트 계정 생성 + 30 크레딧 지급
3. 홈 화면에서 일일운세, 등껍질 해설, 채팅 등 체험 가능

참고: iOS 앱 내 결제 기능은 비활성화되어 있습니다.
크레딧은 가입 시 지급되는 30알로 주요 기능을 체험할 수 있습니다.
```

### URL
- **개인정보처리방침**: https://ggobuk.vercel.app/privacy
- **이용약관**: https://ggobuk.vercel.app/terms
- **지원 URL**: https://ggobuk.vercel.app

## 심사 통과 후

1. Vercel에서 `ALLOW_TEST_BOOTSTRAP` 환경변수 **삭제**
2. Redeploy
