/**
 * Detect if running inside Capacitor iOS native shell.
 * SSR-safe: always returns false on the server.
 */
export function isNativeIOS(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() === true && cap?.getPlatform?.() === "ios";
}

/**
 * Detect if running inside Capacitor Android native shell.
 *
 * 안드로이드를 TWA → Capacitor 로 전환한 뒤부터 이게 '진짜 네이티브 안드로이드'다.
 * (구버전 TWA 설치분은 isTWA() 가 referrer 로 잡는다 — 전환기 동안 둘 다 본다.)
 * Capacitor 는 remote server.url 을 로드해도 WebView 에 네이티브 브릿지를
 * 주입하므로 isNativePlatform()/getPlatform() 이 정상 동작한다.
 * SSR-safe: always returns false on the server.
 */
export function isNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() === true && cap?.getPlatform?.() === "android";
}

/**
 * Android Play 배포 TWA(Trusted Web Activity) 감지.
 *
 * 왜 필요한가: 구글플레이로 깔린 앱(TWA)은 디지털 재화(꼬북알) 결제를 반드시
 * Google Play 결제로 처리해야 한다(정책). 우리는 카카오페이 웹 결제만 있어서
 * 플레이 앱 안에서 '충전(구매)' UI 를 노출하면 정책 위반 → 앱 삭제 위험.
 * 그래서 TWA 안에서는 충전/구매 UI 를 전부 숨긴다(꼬북알 '사용'은 무관, 허용).
 *
 * 감지 원리: TWA 가 앱을 콜드런치하면 시작 문서의 document.referrer 가 정확히
 * 'android-app://<우리 패키지명>' 으로 찍힌다(assetlinks 의 package_name).
 *  - 카카오톡/인스타 등 타 앱의 인앱브라우저(Custom Tab) → android-app://<그 앱> (패키지 다름) → 제외
 *  - 홈 화면에 설치한 PWA(A2HS)          → referrer 빈 값 → 제외(결제 가능해야 함)
 *  - 일반 크롬 탭                         → 웹 referrer  → 제외
 * 즉 오직 '우리' 플레이 배포 TWA 만 정확히 매칭 → 오탐(정상 매출 차단) 없음.
 *
 * referrer 는 문서 생성 시 1회 고정이라 SPA 소프트 네비게이션에선 유지되지만,
 * 세션 도중 하드 리로드가 나면 https:// 로 바뀐다. 그래서 최초 감지 시
 * sessionStorage 에 박아 세션 내내 유지한다. localStorage 가 아니라
 * sessionStorage 인 이유: TWA 는 같은 오리진의 일반 크롬 탭과 localStorage 를
 * '공유'하므로 거기 저장하면 크롬에서도 결제가 막히는 오탐이 생긴다.
 * sessionStorage 는 브라우징 컨텍스트(탭/앱)별로 분리되어 공유되지 않는다.
 */
const TWA_PACKAGE_REFERRER = "android-app://com.niceverygood.ggobuk";
const TWA_SESSION_KEY = "ggobuk_twa";
let twaMemoryFlag = false;

export function isTWA(): boolean {
  if (typeof window === "undefined") return false;
  // 1) 이번 세션에서 이미 감지됨.
  try {
    if (window.sessionStorage.getItem(TWA_SESSION_KEY) === "1") return true;
  } catch {
    if (twaMemoryFlag) return true;
  }
  // 2) 콜드런치 referrer 로 감지(우리 패키지명 정확 매칭).
  let detected = false;
  try {
    detected = (document.referrer || "").startsWith(TWA_PACKAGE_REFERRER);
  } catch {
    detected = false;
  }
  if (detected) {
    twaMemoryFlag = true;
    try {
      window.sessionStorage.setItem(TWA_SESSION_KEY, "1");
    } catch {
      // sessionStorage 불가(프라이빗 모드 등) → 메모리 플래그로 폴백.
    }
  }
  return detected;
}

/**
 * iOS 네이티브(Capacitor) 또는 Android Play TWA = '네이티브 앱'.
 * 두 스토어 모두 인앱 디지털 결제를 자체 결제 시스템으로 강제하므로,
 * 카카오페이 웹 결제(=충전/구매) UI 는 이 함수가 true 일 때 전부 숨긴다.
 */
export function isNativeApp(): boolean {
  return isNativeIOS() || isNativeAndroid() || isTWA();
}
