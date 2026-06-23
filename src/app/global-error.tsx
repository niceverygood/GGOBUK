'use client';

// 루트 에러 바운더리 — 서버/클라이언트 어디서 throw 가 나도 영문 기본 에러 화면 대신
// 한국어 폴백을 보여준다. 의존성 최소화(자체 인라인 스타일)로 바운더리 자체가 안 깨지게.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FDFAF3',
          color: '#2C3E50',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 52 }}>🐢</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>
            잠시 문제가 생겼어요
          </h1>
          <p style={{ fontSize: 14, color: '#82786D', marginTop: 6 }}>
            잠깐 후 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 22,
              padding: '12px 30px',
              borderRadius: 16,
              border: 'none',
              background: '#2C3E50',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
