'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    if (loading) return;
    if (!window.confirm('로그아웃 할까요? 다음 로그인까지 알림은 받지 않아요.'))
      return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      // global scope: 모든 기기/탭의 세션 일괄 종료.
      const { error: signOutError } = await supabase.auth.signOut({
        scope: 'global',
      });
      if (signOutError) throw signOutError;
      // 페르소나 모드 cookie 정리 (다음 로그인 사용자가 이전 모드를 상속받지 않게).
      document.cookie = 'ggobuk_persona_mode=;path=/;max-age=0;samesite=lax';
      // 모드 localStorage도 클리어.
      try {
        window.localStorage.removeItem('ggobuk_persona_mode');
      } catch {
        // private mode 등에서 실패해도 무시.
      }
      router.replace('/login');
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '로그아웃에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-red/30 bg-white py-3.5 text-sm font-black text-red shadow-[0_8px_18px_rgba(231,76,60,0.08)] transition active:scale-[0.99] disabled:opacity-60"
      >
        <LogOut size={15} strokeWidth={2.8} />
        {loading ? '로그아웃 중…' : '로그아웃'}
      </button>
      {error && (
        <p className="text-center text-[11px] font-bold text-red">{error}</p>
      )}
    </div>
  );
}
