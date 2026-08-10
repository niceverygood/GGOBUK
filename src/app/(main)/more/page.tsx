import Link from 'next/link';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Bell, ChevronRight, UserRound } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, Card } from '@/components/ui/primitives';
import { CREDIT_UNIT } from '@/lib/credits';
import { MoreStoreLink } from '@/components/nav/MoreStoreLink';
import { LogoutButton } from '@/components/nav/LogoutButton';

export default async function MorePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  const credits = Number(userRow?.credit_balance ?? 0);

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <p className="text-sm font-extrabold text-muted">내 계정과 기록</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-navy">
          내 정보
        </h1>

        <Card className="mt-5 flex items-center gap-4 p-5">
          <KkobukAvatar size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-muted">로그인 계정</p>
            <p className="mt-1 truncate text-lg font-black text-navy">
              {userRow?.nickname ?? user.email ?? '꼬북이'}
            </p>
          </div>
          <Badge tone="gold">
            {credits} {CREDIT_UNIT}
          </Badge>
        </Card>

        <section className="mt-7">
          <h2 className="mb-3 text-base font-black text-navy">꼬북알</h2>
          <div className="space-y-2">
            <MoreStoreLink credits={credits} />
          </div>
        </section>

        <section className="mt-7">
          <h2 className="mb-3 text-base font-black text-navy">계정 설정</h2>
          <div className="space-y-2">
            <MoreLink
              href="/more/people?edit=self"
              title="내 생년월일 수정"
              subtitle="내 이름·생년월일시·음양력 변경"
              icon={<UserRound size={22} strokeWidth={2.5} />}
            />
            <MoreLink
              href="/more/settings"
              title="알림 및 개인정보"
              subtitle="운세 알림·AI 동의·계정 관리"
              icon={<Bell size={22} strokeWidth={2.5} />}
            />
          </div>
        </section>

        <LogoutButton />
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
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white border border-navy/10 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)]"
    >
      <span className="flex h-8 w-8 items-center justify-center text-xl">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-navy">{title}</div>
        <div className="text-xs font-bold text-muted mt-0.5">{subtitle}</div>
      </div>
      <ChevronRight size={18} strokeWidth={2.6} className="shrink-0 text-muted" />
    </Link>
  );
}
