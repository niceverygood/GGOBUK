'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushTime, setPushTime] = useState('07:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setPushEnabled(!!d.user.push_enabled);
          setPushTime(d.user.push_time?.slice(0, 5) ?? '07:00');
        }
      });
  }, []);

  async function togglePush(next: boolean) {
    if (next) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
      });
      await fetch('/api/me/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true, token: JSON.stringify(sub.toJSON()), time: pushTime }),
      });
    } else {
      await fetch('/api/me/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
    }
    setPushEnabled(next);
  }

  async function saveTime() {
    setSaving(true);
    await fetch('/api/me/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: pushEnabled, time: pushTime }),
    });
    setSaving(false);
  }

  return (
    <main className="px-5 pt-8 pb-32">
      <h1 className="text-2xl font-bold">알림 설정</h1>

      <section className="mt-6 rounded-3xl bg-white shadow-sm p-5 space-y-4">
        <label className="flex items-center justify-between">
          <span>매일 한 줄 운세 알림</span>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(e) => togglePush(e.target.checked)}
            className="w-5 h-5"
          />
        </label>

        {pushEnabled && (
          <div className="flex items-center justify-between">
            <span>알림 시간</span>
            <div className="flex gap-2">
              <input
                type="time"
                value={pushTime}
                onChange={(e) => setPushTime(e.target.value)}
                className="rounded-xl bg-[var(--color-paper)] px-3 py-1 text-sm"
              />
              <button
                onClick={saveTime}
                disabled={saving}
                className="rounded-xl bg-[var(--color-ink)] text-white text-sm px-3 py-1"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="mt-4 text-xs opacity-50">iOS PWA에서는 iOS 16.4 이상에서만 푸시가 동작해.</p>
    </main>
  );
}
