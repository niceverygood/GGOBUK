import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Archive,
  CalendarCheck,
  ChevronRight,
  HeartHandshake,
  ScrollText,
  Settings,
  UserRound,
  UsersRound,
  Waypoints,
} from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { Badge, Card } from '@/components/ui/primitives';
import { RelationDeleteButton } from '@/components/relations/RelationDeleteButton';
import { PremiumServiceStore } from '@/components/library/PremiumServiceStore';
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

  const [
    interpretationsResult,
    relationsResult,
    dailyResult,
    sessionsResult,
    peopleResult,
    comicsResult,
    sharesResult,
  ] = await Promise.all([
    supabase
      .from('interpretations')
      .select('category, persona, generated_at')
      .eq('saju_id', profile.id)
      .order('generated_at', { ascending: false })
      .limit(20),
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
    supabase
      .from('saju_profiles')
      .select('id, relation_type', { count: 'exact' })
      .eq('owner_id', user.id),
    // 사주 웹툰 (high-margin 콘텐츠 갤러리)
    supabase
      .from('interpretation_comics')
      .select('id, category, persona, title, image_url, generated_at')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(12),
    // 내가 만든 공유 링크
    supabase
      .from('saju_shares')
      .select('token, title, kind, category, view_count, created_at, expires_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const interpretations = interpretationsResult.data ?? [];
  const relations = relationsResult.data ?? [];
  const comics = comicsResult.data ?? [];
  const shares = sharesResult.data ?? [];
  const daily = dailyResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const peopleRows = peopleResult.data ?? [];
  const friendCount = peopleRows.filter(
    (p) => p.relation_type !== 'self',
  ).length;

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 pr-28">
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

        <Link
          href="/people"
          prefetch
          className="mt-4 block rounded-3xl border border-navy/10 bg-gradient-to-br from-mint/25 via-white to-gold/15 p-4 shadow-[0_10px_24px_rgba(44,62,80,0.06)] transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/80 text-navy shadow-sm">
              <UsersRound size={22} strokeWidth={2.6} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-navy">사람 관리</p>
                <Badge tone="mint" className="px-2 py-1 text-[10px]">
                  허브
                </Badge>
              </div>
              <p className="mt-1 text-[11px] font-bold leading-relaxed text-muted">
                내 사주 + 인연 {friendCount}명을 한 곳에서 · 등껍질·궁합·수정 바로가기
              </p>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={2.4}
              className="shrink-0 text-navy/40"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <span className="rounded-2xl bg-white/80 px-2 py-2 text-[10px] font-black text-navy">
              <UserRound
                size={13}
                strokeWidth={2.6}
                className="mx-auto mb-0.5"
              />
              내 사주
            </span>
            <span className="rounded-2xl bg-white/80 px-2 py-2 text-[10px] font-black text-navy">
              <UsersRound
                size={13}
                strokeWidth={2.6}
                className="mx-auto mb-0.5"
              />
              인연 {friendCount}
            </span>
            <span className="rounded-2xl bg-white/80 px-2 py-2 text-[10px] font-black text-navy">
              <HeartHandshake
                size={13}
                strokeWidth={2.6}
                className="mx-auto mb-0.5"
              />
              궁합 {relations.length}
            </span>
          </div>
        </Link>

        <LibrarySection
          title="사주해설"
          count={interpretations.length}
          icon={<ScrollText size={18} strokeWidth={2.4} />}
          empty="아직 생성한 사주해설이 없어."
          actionHref="/shell"
          actionLabel="등껍질 열기"
        >
          {interpretations.map((item) => {
            // 3일 보관 정책 — generated_at + 3일 후 자동 삭제 (cron).
            // 표시: 남은 시간 + 24h 이내면 강조.
            // eslint-disable-next-line react-hooks/purity -- 서버 컴포넌트(요청당 1회 렌더): Date.now 안전
            const ageMs = Date.now() - new Date(item.generated_at).getTime();
            const remainHours = Math.max(
              0,
              Math.round((3 * 24 * 60 * 60 * 1000 - ageMs) / (60 * 60 * 1000)),
            );
            const urgentSoon = remainHours <= 24;
            const personaLabel =
              PERSONAS[item.persona as PersonaKey]?.displayName ?? '꼬북이';
            return (
              <LibraryRow
                key={`${item.category}-${item.persona}-${item.generated_at}`}
                href={`/shell/${item.category}`}
                title={
                  CATEGORY_TITLE[item.category as InterpretationCategory] ??
                  '사주해설'
                }
                subtitle={`${personaLabel} 모드 · ${formatDate(item.generated_at)} 생성 · ${
                  remainHours <= 0
                    ? '만료'
                    : remainHours < 24
                      ? `${remainHours}시간 후 만료`
                      : `${Math.floor(remainHours / 24)}일 ${remainHours % 24}시간 남음`
                }`}
                status={urgentSoon ? '⏳ 곧 만료' : '완료'}
              />
            );
          })}
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

        {/* 사주 웹툰 갤러리 — high-margin 콘텐츠 다시 보기 + 자랑하기 */}
        {comics.length > 0 && (
          <section className="mt-5">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-muted">
                  내가 만든 4컷 웹툰
                </p>
                <h2 className="text-base font-black text-navy">사주 웹툰 갤러리</h2>
              </div>
              <span className="text-[11px] font-extrabold text-mint-dark">
                {comics.length}장
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {comics.map((c) => (
                <a
                  key={c.id}
                  href={c.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[0_8px_18px_rgba(44,62,80,0.06)] active:scale-[0.99]"
                >
                  {/* aspect 2:3 (1024x1536 비례) */}
                  <div className="aspect-[2/3] w-full overflow-hidden bg-ivory">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.image_url}
                      alt={c.title || '사주 웹툰'}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 via-navy/55 to-transparent p-2.5">
                    <p className="text-[10px] font-extrabold text-white/85 leading-none">
                      {CATEGORY_TITLE[c.category as InterpretationCategory] ?? c.category}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-white/70 leading-none">
                      {formatDate(c.generated_at)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 내가 만든 공유 링크 */}
        {shares.length > 0 && (
          <section className="mt-5">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-muted">
                  친구한테 보낸 풀이
                </p>
                <h2 className="text-base font-black text-navy">공유 링크</h2>
              </div>
              <span className="text-[11px] font-extrabold text-mint-dark">
                {shares.length}건
              </span>
            </div>
            <div className="space-y-2">
              {shares.map((s) => {
                // eslint-disable-next-line react-hooks/purity -- 서버 컴포넌트(요청당 1회 렌더): Date.now 안전
                const nowMs = Date.now();
                const expired = s.expires_at
                  ? new Date(s.expires_at).getTime() < nowMs
                  : false;
                return (
                  <a
                    key={s.token}
                    href={`/share/${s.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block rounded-2xl border bg-white p-3 active:scale-[0.99] ${
                      expired
                        ? 'border-navy/8 opacity-60'
                        : 'border-mint/30'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-black text-navy truncate">
                        {s.title ?? '사주 풀이'}
                      </p>
                      <span
                        className={`text-[10px] font-extrabold ${
                          expired ? 'text-muted' : 'text-mint-dark'
                        }`}
                      >
                        {expired ? '만료' : `${s.view_count ?? 0}회 조회`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-bold text-muted">
                      {formatDate(s.created_at)} 공유
                      {!expired && s.expires_at &&
                        ` · ${Math.max(
                          0,
                          Math.ceil(
                            (new Date(s.expires_at).getTime() - nowMs) /
                              (1000 * 60 * 60 * 24),
                          ),
                        )}일 남음`}
                    </p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* 기록들 아래에 — 보관함은 '내 기록'이 먼저, 상점은 하단으로 */}
        <PremiumServiceStore />

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
