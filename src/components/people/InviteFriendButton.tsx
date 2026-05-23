'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';

export function InviteFriendButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function invite() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/relations/invite', { method: 'POST' });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error ?? 'invite_failed');
      const shareText = `${d.hostName ?? '나'}와의 궁합 보러올래? 🐢 꼬북점`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: '꼬북점 궁합 초대',
            text: shareText,
            url: d.url,
          });
          setMsg('초대 링크를 공유했어요!');
        } catch {
          await navigator.clipboard.writeText(d.url);
          setMsg('링크를 복사했어요. 친구에게 보내세요!');
        }
      } else {
        await navigator.clipboard.writeText(d.url);
        setMsg('링크를 복사했어요. 친구에게 보내세요!');
      }
    } catch (e) {
      setMsg(
        e instanceof Error && e.message === 'no_self_profile'
          ? '내 사주 먼저 등록해야 초대할 수 있어요.'
          : '초대 링크 생성 실패. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setBusy(false);
      window.setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={invite}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-2 text-xs font-black text-[#163438] shadow-[0_10px_18px_rgba(78,205,196,0.28)] disabled:opacity-60"
      >
        <Link2 size={13} strokeWidth={3} />
        {busy ? '링크…' : '친구 초대'}
      </button>
      {msg && (
        <span
          role="status"
          className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-2xl bg-navy px-4 py-2 text-[11px] font-black text-white shadow-[0_12px_24px_rgba(44,62,80,0.24)]"
        >
          {msg}
        </span>
      )}
    </>
  );
}
