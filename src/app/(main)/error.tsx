'use client';

// (main) 그룹 에러 바운더리 — 로그인 후 화면(홈/사주/채팅 등)의 Server Component 가
// throw 해도 빈/영문 화면 대신 한국어 폴백 + 다시 시도. 의존성 최소화로 자체 안정성 확보.
export default function MainError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">🐢</div>
      <h1 className="mt-3 text-lg font-black text-navy">잠시 문제가 생겼어요</h1>
      <p className="mt-1.5 text-sm font-bold leading-relaxed text-muted">
        화면을 불러오지 못했어요.
        <br />
        잠깐 후 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-2xl bg-navy px-8 py-3 text-sm font-black text-white transition active:scale-[0.99]"
      >
        다시 시도
      </button>
    </main>
  );
}
