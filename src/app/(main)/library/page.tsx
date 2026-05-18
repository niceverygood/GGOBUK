import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Archive,
  CalendarCheck,
  HeartHandshake,
  MessageCircle,
  ScrollText,
  Settings,
  Waypoints,
} from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { Badge, Card } from '@/components/ui/primitives';
import { RelationDeleteButton } from '@/components/relations/RelationDeleteButton';
import type { InterpretationCategory } from '@/types/db';

const CATEGORY_TITLE = Object.fromEntries(
  INTERPRETATION_CATEGORIES.map((cat) => [cat.key, cat.title]),
) as Record<InterpretationCategory, string>;

function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function relationPerson(row: {
  saju_b?:
    | { name?: string | null; relation_label?: string | null }
    | Array<{ name?: string | null; relation_label?: string | null }>
    | null;
}) {
  if (Array.isArray(row.saju_b)) return row.saju_b[0] ?? null;
  return row.saju_b ?? null;
}

export default async function LibraryPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) redirect('/onboarding/saju');

  const [interpretationsResult, relationsResult, dailyResult, sessionsResult] =
    await Promise.all([
      supabase
        .from('interpretations')
        .select('category, generated_at')
        .eq('saju_id', profile.id)
        .order('generated_at', { ascending: false })
        .limit(5),
      supabase
        .from('relations')
        .select(
          'id, created_at, compatibility, saju_b:saju_profiles!relations_saju_b_id_fkey(name, relation_label)',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('daily_fortunes')
        .select('date, one_liner')
        .eq('saju_id', profile.id)
        .order('date', { ascending: false })
        .limit(3),
      supabase
        .from('chat_sessions')
        .select('id, persona, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3),
    ]);

  const interpretations = interpretationsResult.data ?? [];
  const relations = relationsResult.data ?? [];
  const daily = dailyResult.data ?? [];
  const sessions = sessionsResult.data ?? [];

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-muted">
              {profile.name}님의 기록
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-navy">
              보관함
            </h1>
          </div>
          <Link
            href="/more"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-white border border-navy/10 text-navy shadow-[0_8px_18px_rgba(44,62,80,0.07)]"
            aria-label="설정과 더보기"
          >
            <Settings size={19} strokeWidth={2.4} />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="사주" value={interpretations.length} />
          <Stat label="궁합" value={relations.length} />
          <Stat label="대화" value={sessions.length} />
        </div>

        <LibrarySection
          title="사주해설"
          count={interpretations.length}
          icon={<ScrollText size={18} strokeWidth={2.4} />}
          empty="아직 생성한 사주해설이 없어."
          actionHref="/shell"
          actionLabel="등껍질 열기"
        >
          {interpretations.map((item) => (
            <LibraryRow
              key={`${item.category}-${item.generated_at}`}
              href={`/shell/${item.category}`}
              title={
                CATEGORY_TITLE[item.category as InterpretationCategory] ??
                '사주해설'
              }
              subtitle={`${formatDate(item.generated_at)} 생성`}
              status="완료"
            />
          ))}
        </LibrarySection>

        <LibrarySection
          title="궁합해설"
          count={relations.length}
          icon={<HeartHandshake size={18} strokeWidth={2.4} />}
          empty="아직 저장된 궁합이 없어."
          actionHref="/relations?add=1"
          actionLabel="인연 추가"
        >
          {relations.map((relation) => {
            const person = relationPerson(relation);
            const score = relation.compatibility?.score;
            return (
              <LibraryRelationRow
                key={relation.id}
                relationId={relation.id}
                href={`/relations/${relation.id}`}
                title={person?.name ?? '인연'}
                subtitle={person?.relation_label ?? '궁합 리포트'}
                status={typeof score === 'number' ? `${score}점` : '대기'}
              />
            );
          })}
        </LibrarySection>

        <LibrarySection
          title="오늘의 운세"
          count={daily.length}
          icon={<CalendarCheck size={18} strokeWidth={2.4} />}
          empty="아직 저장된 일일운세가 없어."
          actionHref="/home"
          actionLabel="오늘 보기"
        >
          {daily.map((item) => (
            <LibraryRow
              key={item.date}
              href="/home"
              title={formatDate(item.date)}
              subtitle={item.one_liner}
              status="일일"
            />
          ))}
        </LibrarySection>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <QuickBox
            href="/timeline"
            icon={<Waypoints size={19} strokeWidth={2.4} />}
            title="대운해설"
            subtitle="10년 흐름 다시 보기"
          />
          <QuickBox
            href="/more/auspicious"
            icon={<CalendarCheck size={19} strokeWidth={2.4} />}
            title="택일"
            subtitle="중요한 날 고르기"
          />
          <QuickBox
            href="/chat"
            icon={<MessageCircle size={19} strokeWidth={2.4} />}
            title="대화방"
            subtitle="최근 상담 이어가기"
          />
          <QuickBox
            href="/shell"
            icon={<Archive size={19} strokeWidth={2.4} />}
            title="전체 등껍질"
            subtitle="원국과 풀이 보기"
          />
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card soft className="p-3 text-center">
      <p className="text-[11px] font-extrabold text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-navy">{value}</p>
    </Card>
  );
}

function LibrarySection({
  title,
  count,
  icon,
  empty,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  empty: string;
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-2xl bg-mint/15 text-navy">
            {icon}
          </span>
          <p className="text-sm font-black text-navy">{title}</p>
          <Badge tone="gold" className="px-2 py-1">
            {count}
          </Badge>
        </div>
        <Link href={actionHref} className="text-xs font-black text-mint-dark">
          {actionLabel}
        </Link>
      </div>
      <Card className="overflow-hidden">
        {count > 0 ? (
          <div className="divide-y divide-navy/10">{children}</div>
        ) : (
          <div className="p-5 text-center">
            <p className="text-sm font-bold text-muted">{empty}</p>
            <Link
              href={actionHref}
              className="mt-2 inline-flex text-xs font-black text-mint-dark"
            >
              {actionLabel} →
            </Link>
          </div>
        )}
      </Card>
    </section>
  );
}

function LibraryRow({
  href,
  title,
  subtitle,
  status,
}: {
  href: string;
  title: string;
  subtitle: string;
  status: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 transition active:bg-mint/10"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-navy">{title}</p>
        <p className="mt-0.5 truncate text-xs font-bold text-muted">
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-black text-mint-dark">
        {status}
      </span>
    </Link>
  );
}

function LibraryRelationRow({
  relationId,
  href,
  title,
  subtitle,
  status,
}: {
  relationId: string;
  href: string;
  title: string;
  subtitle: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-2 p-4 transition active:bg-mint/10">
      <Link href={href} className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-navy">{title}</p>
        <p className="mt-0.5 truncate text-xs font-bold text-muted">
          {subtitle}
        </p>
      </Link>
      <span className="shrink-0 rounded-full bg-mint/15 px-2.5 py-1 text-[11px] font-black text-mint-dark">
        {status}
      </span>
      <RelationDeleteButton
        compact
        relationId={relationId}
        relationName={title}
      />
    </div>
  );
}

function QuickBox({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl bg-white border border-navy/10 p-4 shadow-[0_9px_22px_rgba(44,62,80,0.06)] transition active:scale-[0.99]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-mint/15 text-navy">
        {icon}
      </span>
      <p className="mt-3 text-sm font-black text-navy">{title}</p>
      <p className="mt-0.5 text-[11px] font-bold text-muted">{subtitle}</p>
    </Link>
  );
}
