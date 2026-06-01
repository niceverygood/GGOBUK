import Link from 'next/link';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Bell, Brain, CalendarCheck, Map, UsersRound } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
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
        <h1 className="text-2xl font-black tracking-tight text-navy">더보기</h1>

        <Card className="mt-5 p-5 flex items-center gap-4">
          <KkobukAvatar size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-muted">계정</p>
            <p className="mt-0.5 text-base font-black text-navy truncate">
              {userRow?.nickname ?? user.email ?? '꼬북이'}
            </p>
          </div>
          <Badge tone="gold">
            {credits} {CREDIT_UNIT}
          </Badge>
        </Card>

        <div className="mt-4 space-y-2">
          <MoreStoreLink credits={credits} />
          <MoreLink
            href="/timeline"
            title="대운 타임라인"
            subtitle={`10년 단위 큰 흐름 · AI 해설은 ${CREDIT_UNIT} 사용`}
            icon={<Map size={22} strokeWidth={2.5} />}
          />
          <MoreLink
            href="/more/auspicious"
            title="길일 찾기"
            subtitle={`중요 일정에 좋은 날짜 · ${CREDIT_UNIT} 사용`}
            icon={<CalendarCheck size={22} strokeWidth={2.5} />}
          />
          <MoreLink
            href="/more/people"
            title="인원 관리"
            subtitle="나와 인연의 이름 · 생년월일시 수정"
            icon={<UsersRound size={22} strokeWidth={2.5} />}
          />
          <MoreLink
            href="/more/memory"
            title="꼬북이의 기억"
            subtitle="꼬북이가 나에 대해 기억하는 것 · 보기·삭제"
            icon={<Brain size={22} strokeWidth={2.5} />}
          />
          <MoreLink
            href="/more/settings"
            title="알림 설정"
            subtitle="매일 아침 한 줄 운세"
            icon={<Bell size={22} strokeWidth={2.5} />}
          />
          <MoreLink
            href="/mode?from=/more"
            title="모드 선택"
            subtitle="꼬북이의 4가지 모드 · 사주풀이·채팅 톤"
            icon={
              <KkobukSprite
                variant="persona-kkobuk"
                size="xs"
                ariaLabel="모드 선택"
              />
            }
          />
        </div>

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
      <span className="text-muted">→</span>
    </Link>
  );
}
