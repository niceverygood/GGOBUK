import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function MorePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase.from('users').select('*').eq('id', user.id).single();

  return (
    <main className="px-5 pt-8 pb-12">
      <h1 className="text-2xl font-bold">더보기</h1>

      <section className="mt-6 rounded-3xl bg-white shadow-sm p-5">
        <div className="text-xs opacity-60">계정</div>
        <div className="mt-1 font-semibold">{userRow?.nickname ?? user.email ?? '꼬북이'}</div>
      </section>

      <div className="mt-4 space-y-2">
        <MoreLink href="/more/pro" title={userRow?.is_pro ? '꼬북점 Pro (구독 중)' : '꼬북점 Pro 구독'} subtitle="모든 풀이 + 무제한 채팅 + 대운 타임라인" />
        <MoreLink href="/timeline" title="대운 타임라인" subtitle="10년 단위 큰 흐름 (Pro)" />
        <MoreLink href="/more/auspicious" title="길일 찾기" subtitle="중요 일정에 좋은 날짜 (Pro)" />
        <MoreLink href="/more/settings" title="알림 설정" subtitle="매일 아침 한 줄 운세" />
      </div>
    </main>
  );
}

function MoreLink({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="block rounded-2xl bg-white p-4 shadow-sm">
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs opacity-60 mt-1">{subtitle}</div>
    </Link>
  );
}
