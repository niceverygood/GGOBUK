import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Hexagon,
  HeartHandshake,
  Pencil,
  Plus,
  Sparkles,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { Badge, Card } from '@/components/ui/primitives';
import { ohaengFromGan } from '@/lib/saju/ohaeng_from_gan';
import { InviteFriendButton } from '@/components/people/InviteFriendButton';
import type { Palja } from '@/lib/saju/types';
import type { RelationType } from '@/types/db';

export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
  gender: 'M' | 'F';
  relation_type: RelationType;
  relation_label: string | null;
  ilgan: string | null;
  palja: Palja | null;
  created_at: string;
}

interface RelationRow {
  id: string;
  saju_b_id: string;
  compatibility: { score?: number | null } | null;
}

interface FriendCardData {
  profile: ProfileRow;
  relationId: string | null;
  compatScore: number | null;
}

const RELATION_LABEL: Record<RelationType, string> = {
  self: '나',
  family: '가족',
  friend: '친구',
  lover: '연인',
  colleague: '동료',
  other: '기타',
};

const RELATION_TONE: Record<RelationType, string> = {
  self: 'bg-mint/20 text-[#17726D]',
  family: 'bg-gold/30 text-[#5A4A20]',
  friend: 'bg-[#DCEBFF] text-[#1C3C5B]',
  lover: 'bg-red/15 text-red',
  colleague: 'bg-navy/10 text-navy',
  other: 'bg-ivory text-muted',
};

function scoreLabel(score: number | null): string {
  if (score == null) return '궁합 대기';
  if (score >= 85) return '아주 강한 인연';
  if (score >= 70) return '좋은 흐름';
  if (score <= 45) return '거리 조절';
  return '차분히 보기';
}

function scoreTone(score: number | null): string {
  if (score == null) return 'bg-navy/10 text-navy';
  if (score >= 70) return 'bg-mint/20 text-[#16706B]';
  if (score <= 45) return 'bg-red/15 text-red';
  return 'bg-gold/35 text-[#5A4A20]';
}

function birthSummary(profile: ProfileRow): string {
  const calendar = profile.is_lunar ? '음력' : '양력';
  const time = profile.birth_time ? profile.birth_time.slice(0, 5) : '시간 모름';
  return `${profile.birth_date} · ${time} · ${calendar}`;
}

export default async function PeoplePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profileRows }, { data: relationRows }] = await Promise.all([
    supabase
      .from('saju_profiles')
      .select(
        'id, name, birth_date, birth_time, is_lunar, gender, relation_type, relation_label, ilgan, palja, created_at',
      )
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('relations')
      .select('id, saju_b_id, compatibility')
      .eq('user_id', user.id),
  ]);

  const profiles = (profileRows ?? []) as ProfileRow[];
  const relations = (relationRows ?? []) as RelationRow[];

  const selfProfile = profiles.find((p) => p.relation_type === 'self') ?? null;
  if (!selfProfile) redirect('/onboarding/saju');

  // Index relations by saju_b_id for O(1) lookup per friend card.
  const relByOther = new Map<string, RelationRow>();
  for (const r of relations) {
    if (r.saju_b_id) relByOther.set(r.saju_b_id, r);
  }

  const friendCards: FriendCardData[] = profiles
    .filter((p) => p.relation_type !== 'self')
    .map((profile) => {
      const rel = relByOther.get(profile.id);
      const score =
        typeof rel?.compatibility?.score === 'number'
          ? rel.compatibility.score
          : null;
      return {
        profile,
        relationId: rel?.id ?? null,
        compatScore: score,
      };
    });

  const summary = {
    total: friendCards.length,
    good: friendCards.filter((c) => (c.compatScore ?? 0) >= 70).length,
    caution: friendCards.filter((c) => (c.compatScore ?? 100) <= 45).length,
    pending: friendCards.filter((c) => c.compatScore == null).length,
  };

  const selfDay = selfProfile.palja?.day;
  const selfOhaeng = ohaengFromGan(selfProfile.ilgan);

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 pr-12">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-muted">사람 중심으로 보는 사주</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-navy">사람 관리</h1>
            <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
              내 사주와 인연을 한 곳에서 · 등껍질·궁합이 바로 열려.
            </p>
          </div>
          <Link
            href="/more/people"
            prefetch
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-navy px-3 py-2 text-xs font-black text-white shadow-[0_10px_18px_rgba(44,62,80,0.16)]"
          >
            <Plus size={13} strokeWidth={3} />
            등록
          </Link>
        </div>

        {/* SELF HERO CARD */}
        <Card className="mt-5 overflow-hidden p-0">
          <div className="bg-gradient-to-br from-mint/25 via-white to-gold/15 p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="mint">나</Badge>
              <Link
                href={`/more/people?edit=self`}
                className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-black text-navy"
              >
                <Pencil size={12} strokeWidth={3} />
                수정
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/80 text-navy shadow-sm">
                <UserRound size={22} strokeWidth={2.6} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-navy">
                  {selfProfile.name}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-muted">
                  {birthSummary(selfProfile)} ·{' '}
                  {selfProfile.gender === 'M' ? '남성' : '여성'}
                </p>
              </div>
            </div>

            {selfDay && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/85 p-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-white text-lg font-hanja font-black">
                  {selfDay.ganHanja}
                  {selfDay.jiHanja}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold text-muted">
                    일주 · 일간 오행
                  </p>
                  <p className="text-sm font-black text-navy">
                    {selfDay.gan}
                    {selfDay.ji} · {selfOhaeng}
                  </p>
                </div>
                {selfProfile.palja && (
                  <span className="rounded-full bg-mint/25 px-2.5 py-1 text-[10px] font-black text-[#16706B]">
                    8자 완성
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/shell"
                prefetch
                className="inline-flex items-center justify-center gap-1 rounded-2xl bg-navy py-3 text-sm font-black text-white shadow-[0_10px_18px_rgba(44,62,80,0.18)]"
              >
                <Hexagon size={15} strokeWidth={2.6} />내 등껍질
              </Link>
              <Link
                href="/library"
                prefetch
                className="inline-flex items-center justify-center gap-1 rounded-2xl bg-white py-3 text-sm font-black text-navy border border-navy/10"
              >
                <Sparkles size={15} strokeWidth={2.6} />
                12풀이
              </Link>
            </div>
          </div>
        </Card>

        {/* INVITE / ADD BAR */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-navy">
              내 인연 ({summary.total}명)
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-muted">
              귀인 {summary.good} · 조절 {summary.caution}
              {summary.pending > 0 ? ` · 대기 ${summary.pending}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <InviteFriendButton />
            <Link
              href="/relations?add=1"
              prefetch
              className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-2 text-xs font-black text-white shadow-[0_10px_18px_rgba(44,62,80,0.16)]"
            >
              <UserPlus size={13} strokeWidth={3} />
              인연 추가
            </Link>
          </div>
        </div>

        {/* FRIEND GRID */}
        {friendCards.length === 0 ? (
          <Card className="mt-4 p-6 text-center">
            <Badge tone="mint">등록된 인연 없음</Badge>
            <p className="mt-3 text-sm font-bold text-muted leading-relaxed">
              가족·연인·친구를 추가하면 일주 합/충까지 보여줘.
              <br />
              직접 입력하거나 친구 초대 링크로 받아봐.
            </p>
            <Link
              href="/relations?add=1"
              prefetch
              className="mt-4 inline-flex items-center justify-center gap-1 rounded-full bg-mint px-4 py-2.5 text-xs font-black text-[#163438]"
            >
              <UserPlus size={13} strokeWidth={3} />첫 인연 추가
            </Link>
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3">
            {friendCards.map(({ profile, relationId, compatScore }) => {
              const day = profile.palja?.day;
              const oh = ohaengFromGan(profile.ilgan);
              const label =
                profile.relation_label?.trim() ||
                RELATION_LABEL[profile.relation_type];
              return (
                <Card key={profile.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                        RELATION_TONE[profile.relation_type]
                      }`}
                    >
                      <UsersRound size={22} strokeWidth={2.6} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-black text-navy">
                          {profile.name}
                        </p>
                        <Badge
                          tone={
                            profile.relation_type === 'lover' ? 'red' : 'gold'
                          }
                          className="px-2 py-1 text-[10px]"
                        >
                          {label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-muted">
                        {birthSummary(profile)} ·{' '}
                        {profile.gender === 'M' ? '남' : '여'}
                      </p>
                      {day && (
                        <p className="mt-1 text-xs font-black text-navy">
                          일주{' '}
                          <span className="font-hanja">
                            {day.ganHanja}
                            {day.jiHanja}
                          </span>{' '}
                          · {oh}
                        </p>
                      )}
                    </div>
                    <span
                      className={`grid min-w-[58px] shrink-0 place-items-center rounded-2xl px-2 py-2 text-xs font-black leading-tight ${scoreTone(
                        compatScore,
                      )}`}
                    >
                      {compatScore != null ? (
                        <>
                          <span className="text-lg leading-none">
                            {compatScore}
                          </span>
                          <span className="mt-0.5 text-[9px] font-extrabold opacity-80">
                            궁합
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-extrabold">
                          궁합
                          <br />
                          대기
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {relationId ? (
                      <Link
                        href={`/relations/${relationId}`}
                        prefetch
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl bg-mint text-sm font-black text-[#163438]"
                      >
                        <HeartHandshake size={14} strokeWidth={2.6} />
                        궁합 보기
                      </Link>
                    ) : (
                      <Link
                        href={`/relations?add=1`}
                        prefetch
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl bg-mint/40 text-sm font-black text-navy"
                      >
                        <HeartHandshake size={14} strokeWidth={2.6} />
                        궁합 만들기
                      </Link>
                    )}
                    <Link
                      href={`/more/people?edit=${profile.id}`}
                      prefetch
                      className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl border border-navy/10 bg-white text-sm font-black text-navy"
                    >
                      <Pencil size={14} strokeWidth={2.6} />
                      정보 수정
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-[11px] font-bold text-muted">
          <span>관계도로 한눈에 보고 싶다면?</span>
          <Link
            href="/relations"
            prefetch
            className="rounded-full bg-navy/90 px-3 py-1.5 text-[11px] font-black text-white"
          >
            인연 지도 →
          </Link>
        </div>
      </div>
    </main>
  );
}
