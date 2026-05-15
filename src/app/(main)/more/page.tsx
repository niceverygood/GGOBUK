import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, Card } from '@/components/ui/primitives';

export default async function MorePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase.from('users').select('*').eq('id', user.id).single();

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <h1 className="text-2xl font-black tracking-tight text-navy">더보기</h1>

        <Card className="mt-5 p-5 flex items-center gap-4">
          <KkobukAvatar size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-muted">계정</p>
            <p className="mt-0.5 text-base font-black text-navy truncate">
              {userRow?.nickname ?? user.email ?? '꼬북이'}
            </p>
          </div>
          {userRow?.is_pro && <Badge tone="gold">PRO</Badge>}
        </Card>

        <div className="mt-4 space-y-2">
          <MoreLink
            href="/more/pro"
            title={userRow?.is_pro ? '꼬북점 Pro (구독 중)' : '꼬북점 Pro 구독'}
            subtitle="모든 풀이 + 무제한 채팅 + 대운 타임라인"
            icon="✨"
          />
          <MoreLink href="/timeline" title="대운 타임라인" subtitle="10년 단위 큰 흐름 (Pro)" icon="🗺" />
          <MoreLink href="/more/auspicious" title="길일 찾기" subtitle="중요 일정에 좋은 날짜 (Pro)" icon="☯" />
          <MoreLink href="/more/settings" title="알림 설정" subtitle="매일 아침 한 줄 운세" icon="🔔" />
          <MoreLink href="/persona" title="페르소나 전환" subtitle="꼬북이의 4가지 모드" icon="🐢" />
        </div>
      </div>
    </main>
  );
}

function MoreLink({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white border border-navy/10 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)]"
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-navy">{title}</div>
        <div className="text-xs font-bold text-muted mt-0.5">{subtitle}</div>
      </div>
      <span className="text-muted">→</span>
    </Link>
  );
}
