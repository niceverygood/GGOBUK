'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** VAPID public key(base64url) → ArrayBuffer. applicationServerKey 요구 형식(BufferSource). */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export default function SettingsPage() {
  const router = useRouter();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushTime, setPushTime] = useState('07:00');
  const [saving, setSaving] = useState(false);

  // AI 동의 상태
  const [consented, setConsented] = useState<boolean | null>(null);
  const [revoking, setRevoking] = useState(false);

  // 계정 삭제 UX
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const me = await fetch('/api/me').then((r) => r.json());
      if (me.user) {
        setPushEnabled(!!me.user.push_enabled);
        setPushTime(me.user.push_time?.slice(0, 5) ?? '07:00');
      }
      const consent = await fetch('/api/me/ai-consent').then((r) => r.json());
      setConsented(!!consent.consented);
    })();
  }, []);

  async function togglePush(next: boolean) {
    if (next) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        window.alert('푸시 설정이 아직 준비되지 않았어요. 잠시 후 다시 시도해줘.');
        return;
      }
      if (
        typeof Notification === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        window.alert(
          '이 브라우저는 푸시를 지원하지 않아요. iOS는 홈 화면에 추가(PWA) 후 iOS 16.4+ 에서 가능해요.',
        );
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      // 기존 구독 있으면 재사용, 없으면 새로 구독.
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));
      await fetch('/api/me/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          token: JSON.stringify(sub.toJSON()),
          time: pushTime,
        }),
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

  async function revokeAiConsent() {
    if (!window.confirm('AI 풀이·채팅 사용 동의를 철회할까? 동의 전에는 새 풀이를 받을 수 없어.'))
      return;
    setRevoking(true);
    await fetch('/api/me/ai-consent', { method: 'DELETE' });
    setConsented(false);
    setRevoking(false);
  }

  async function deleteAccount() {
    setDeleteError(null);
    if (deleteConfirm.trim() !== '삭제') {
      setDeleteError('확인을 위해 "삭제"를 정확히 입력해줘.');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/me/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: deleteConfirm.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || json.error || '계정 삭제 실패');
      }
      // 클라이언트 세션 정리.
      try {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // ignore
      }
      try {
        window.localStorage.removeItem('ggobuk_persona_mode');
      } catch {
        // ignore
      }
      document.cookie = 'ggobuk_persona_mode=;path=/;max-age=0;samesite=lax';
      router.replace('/login?deleted=1');
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '계정 삭제에 실패했어');
      setDeleting(false);
    }
  }

  return (
    <main className="px-5 pt-8 pb-32">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* 알림 */}
      <section className="mt-6 rounded-3xl bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-base font-black text-navy">알림</h2>
        <label className="flex items-center justify-between">
          <span className="text-sm font-bold">매일 한 줄 운세 알림</span>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(e) => togglePush(e.target.checked)}
            className="w-5 h-5"
          />
        </label>

        {pushEnabled && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">알림 시간</span>
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
        <p className="text-xs opacity-50">
          iOS PWA에서는 iOS 16.4 이상에서만 푸시가 동작해.
        </p>
      </section>

      {/* AI 동의 */}
      <section className="mt-4 rounded-3xl bg-white shadow-sm p-5 space-y-3">
        <h2 className="text-base font-black text-navy">AI 데이터 사용 동의</h2>
        <p className="text-xs font-bold text-muted leading-6">
          사주·이름·채팅 메시지를 Anthropic Claude API로 전송해 풀이를 만들고
          있어. 자세한 처리 내역은{' '}
          <Link href="/privacy" className="underline underline-offset-2">
            개인정보 처리방침
          </Link>
          에 있어.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">
            현재 상태:{' '}
            <span className={consented ? 'text-mint-dark' : 'text-red'}>
              {consented === null ? '확인 중…' : consented ? '동의함' : '미동의'}
            </span>
          </span>
          {consented && (
            <button
              type="button"
              onClick={revokeAiConsent}
              disabled={revoking}
              className="rounded-xl border border-red/30 px-3 py-1.5 text-xs font-black text-red"
            >
              {revoking ? '철회 중…' : '동의 철회'}
            </button>
          )}
        </div>
      </section>

      {/* 계정 삭제 */}
      <section className="mt-4 rounded-3xl bg-white shadow-sm p-5 space-y-3 border border-red/20">
        <h2 className="text-base font-black text-red">계정 삭제</h2>
        <p className="text-xs font-bold text-muted leading-6">
          내 사주, 등록한 인연, 채팅 기록, 결제 내역, 푸시 토큰 등 모든 데이터가
          즉시 영구 삭제돼. 이 작업은 되돌릴 수 없어.
        </p>

        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="w-full rounded-2xl border border-red/40 py-3 text-sm font-black text-red"
          >
            계정 삭제 진행
          </button>
        ) : (
          <div className="space-y-3 rounded-2xl bg-red/5 p-4">
            <p className="text-xs font-bold text-red">
              계속하려면 아래에 <strong>삭제</strong> 라고 입력해줘.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="삭제"
              className="w-full rounded-xl border border-red/30 bg-white px-3 py-2 text-sm"
              autoComplete="off"
            />
            {deleteError && (
              <p className="text-xs font-bold text-red">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm('');
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 rounded-2xl border border-line bg-white py-2.5 text-sm font-black text-muted"
              >
                취소
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting || deleteConfirm.trim() !== '삭제'}
                className="flex-1 rounded-2xl bg-red py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {deleting ? '삭제 중…' : '영구 삭제'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
