'use client';

import { useEffect, useState } from 'react';

/**
 * 네트워크 끊김 대비 오버레이.
 *
 * 꼬북점 앱(iOS Capacitor server.url / Android TWA)은 원격 웹을 로드하는
 * 구조라 인터넷이 끊기면 빈 화면이 될 수 있다. 이 컴포넌트가 offline 을
 * 감지해 안내 + 재시도 오버레이를 띄워 "빈 화면" UX 를 방지한다.
 *
 * navigator.onLine 은 완벽하진 않지만(연결됐어도 인터넷이 안 될 수 있음)
 * 가장 가벼운 1차 신호. 재시도 버튼은 location.reload 로 실제 복구를 확인.
 */
export function OfflineGuard() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // 초기 상태
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);

    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alertdialog"
      aria-label="인터넷 연결 끊김"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-[#FDFAF3] px-8 text-center"
    >
      <div className="text-6xl" aria-hidden>
        🐢
      </div>
      <div>
        <h2 className="text-xl font-black text-navy">인터넷 연결을 확인해줘</h2>
        <p className="mt-2 text-sm font-bold leading-relaxed text-[#82786D]">
          꼬북이가 등껍질을 펼치려면 인터넷이 필요해.
          <br />
          연결 상태를 확인하고 다시 시도해줘.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-2xl bg-navy px-6 py-3 text-sm font-black text-white active:scale-[0.98]"
      >
        다시 시도
      </button>
    </div>
  );
}
