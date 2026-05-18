'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Badge, ButtonPrimary, Card, Toggle } from '@/components/ui/primitives';
import type { Palja } from '@/lib/saju/types';
import type { RelationType } from '@/types/db';

type Gender = 'M' | 'F';

interface ProfileRow {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
  is_leap_month: boolean;
  gender: Gender;
  relation_type: RelationType;
  relation_label: string | null;
  created_at: string;
  updated_at: string;
  ilgan: string | null;
  palja: Palja | null;
}

interface Draft {
  id?: string;
  name: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  isLunar: boolean;
  isLeapMonth: boolean;
  gender: Gender;
  relationType: RelationType;
  relationLabel: string;
}

const RELATION_LABELS: Record<RelationType, string> = {
  self: '나',
  family: '가족',
  friend: '친구',
  lover: '연인',
  colleague: '동료',
  other: '기타',
};

const RELATION_OPTIONS: Array<{ value: RelationType; label: string }> = [
  { value: 'self', label: '나' },
  { value: 'family', label: '가족' },
  { value: 'friend', label: '친구' },
  { value: 'lover', label: '연인' },
  { value: 'colleague', label: '동료' },
  { value: 'other', label: '기타' },
];

const EMPTY_DRAFT: Draft = {
  name: '',
  birthDate: '',
  birthTime: '',
  timeUnknown: false,
  isLunar: false,
  isLeapMonth: false,
  gender: 'M',
  relationType: 'friend',
  relationLabel: '',
};

function toTimeInput(value: string | null) {
  return value ? value.slice(0, 5) : '';
}

function profileToDraft(profile: ProfileRow): Draft {
  return {
    id: profile.id,
    name: profile.name,
    birthDate: profile.birth_date,
    birthTime: toTimeInput(profile.birth_time),
    timeUnknown: !profile.birth_time,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
    relationType: profile.relation_type,
    relationLabel: profile.relation_label ?? '',
  };
}

function profileSubtitle(profile: ProfileRow) {
  const calendar = profile.is_lunar ? '음력' : '양력';
  const time = profile.birth_time
    ? toTimeInput(profile.birth_time)
    : '시간 모름';
  return `${profile.birth_date} · ${time} · ${calendar} · ${profile.gender === 'M' ? '남성' : '여성'}`;
}

function apiErrorMessage(error: string) {
  if (error === 'unauthorized') return '로그인이 필요해. 다시 로그인해줘.';
  if (error === 'invalid_body') return '이름과 생년월일시를 다시 확인해줘.';
  if (error === 'self_exists') return '내 사주는 이미 등록되어 있어.';
  if (error === 'self_locked') return '내 사주는 다른 관계로 바꿀 수 없어.';
  if (error === 'self_reserved') return '인연은 내 사주로 바꿀 수 없어.';
  if (error === 'profile_not_found') return '대상을 찾지 못했어.';
  return error || '처리하지 못했어. 잠시 후 다시 시도해줘.';
}

export default function PeoplePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');

  const hasSelf = useMemo(
    () => profiles.some((profile) => profile.relation_type === 'self'),
    [profiles],
  );

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profiles', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'load_failed');
      setProfiles(data.profiles ?? []);
    } catch (e) {
      setError(apiErrorMessage(e instanceof Error ? e.message : ''));
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setError('');
    setDraft({
      ...EMPTY_DRAFT,
      relationType: hasSelf ? 'friend' : 'self',
      relationLabel: hasSelf ? '' : '본인',
    });
  }

  function startEdit(profile: ProfileRow) {
    setError('');
    setDraft(profileToDraft(profile));
  }

  function patchDraft(next: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  async function saveDraft() {
    if (!draft) return;
    setError('');

    const name = draft.name.trim();
    const relationLabel = draft.relationLabel.trim();
    if (!name || !draft.birthDate || (!draft.timeUnknown && !draft.birthTime)) {
      setError(
        '이름, 생년월일, 시간을 확인해줘. 시간이 없으면 시간 모름을 체크하면 돼.',
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        birthDate: draft.birthDate,
        birthTime: draft.timeUnknown ? null : draft.birthTime,
        isLunar: draft.isLunar,
        isLeapMonth: draft.isLunar ? draft.isLeapMonth : false,
        gender: draft.gender,
        relationType: draft.relationType,
        relationLabel:
          draft.relationType === 'self'
            ? relationLabel || '본인'
            : relationLabel,
      };

      const res = await fetch(
        draft.id ? `/api/profiles/${draft.id}` : '/api/profiles',
        {
          method: draft.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'save_failed');

      setDraft(null);
      await loadProfiles();
      router.refresh();
    } catch (e) {
      setError(apiErrorMessage(e instanceof Error ? e.message : ''));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProfile(profile: ProfileRow) {
    const isSelf = profile.relation_type === 'self';
    const message = isSelf
      ? '내 사주를 삭제하면 등껍질과 오늘 운세를 다시 만들기 전까지 이용할 수 없어. 삭제할까?'
      : `${profile.name} 인연과 연결된 궁합 기록도 함께 정리할게. 삭제할까?`;
    if (!window.confirm(message)) return;

    setDeletingId(profile.id);
    setError('');
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'delete_failed');
      if (data.deletedSelf) {
        router.replace('/onboarding/saju');
        return;
      }
      await loadProfiles();
      router.refresh();
    } catch (e) {
      setError(apiErrorMessage(e instanceof Error ? e.message : ''));
    } finally {
      setDeletingId('');
    }
  }

  const selectableRelations =
    hasSelf || Boolean(draft?.id)
      ? RELATION_OPTIONS.filter((option) => option.value !== 'self')
      : RELATION_OPTIONS;

  return (
    <main className="relative px-5 pb-36 pt-7">
      <div className="hanji-overlay" />
      <div className="relative mx-auto w-full max-w-[560px]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/more"
              className="inline-flex items-center gap-1 text-xs font-black text-muted"
            >
              <ArrowLeft size={14} strokeWidth={3} />
              더보기
            </Link>
            <h1 className="mt-2 text-[30px] font-black tracking-tight text-navy">
              인원 관리
            </h1>
            <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
              나와 인연의 이름, 생년월일시, 관계를 관리해.
            </p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="shrink-0 rounded-full bg-navy px-4 py-2.5 text-xs font-black text-white shadow-[0_10px_18px_rgba(44,62,80,0.16)]"
          >
            <span className="inline-flex items-center gap-1">
              <Plus size={14} strokeWidth={3} />
              등록
            </span>
          </button>
        </div>

        {!hasSelf && !loading && (
          <Card className="mt-5 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/40 text-navy">
                <UserRound size={20} strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-sm font-black text-navy">
                  내 사주가 아직 없어요
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
                  먼저 나를 등록하면 홈, 등껍질, 궁합 기능이 다시 열려.
                </p>
              </div>
            </div>
          </Card>
        )}

        {draft && (
          <Card className="mt-5 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-navy">
                  {draft.id ? '인원 수정' : '새 인원 등록'}
                </p>
                <p className="mt-1 text-xs font-bold text-muted">
                  수정 후 기존 AI 해설과 궁합은 새 정보 기준으로 다시 만들게 돼.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ivory text-muted"
                aria-label="닫기"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-muted">
                  이름
                </span>
                <input
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="이름"
                  className="w-full rounded-2xl bg-ivory px-4 py-3 text-sm font-bold text-navy outline-none ring-mint/40 focus:ring-2"
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-black text-muted">
                  관계
                </span>
                {draft.relationType === 'self' && draft.id ? (
                  <div className="rounded-2xl bg-mint/15 px-4 py-3 text-sm font-black text-navy">
                    나
                  </div>
                ) : (
                  <Toggle
                    options={selectableRelations}
                    value={draft.relationType}
                    onChange={(value) => patchDraft({ relationType: value })}
                  />
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-muted">
                  관계 이름
                </span>
                <input
                  value={draft.relationLabel}
                  onChange={(e) =>
                    patchDraft({ relationLabel: e.target.value })
                  }
                  placeholder={
                    draft.relationType === 'self'
                      ? '본인'
                      : '예: 엄마, 친구, 회사 동료'
                  }
                  className="w-full rounded-2xl bg-ivory px-4 py-3 text-sm font-bold text-navy outline-none ring-mint/40 focus:ring-2"
                />
              </label>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-muted">
                    생년월일
                  </span>
                  <span className="relative block">
                    <input
                      type="date"
                      value={draft.birthDate}
                      onChange={(e) =>
                        patchDraft({ birthDate: e.target.value })
                      }
                      className="w-full rounded-2xl bg-ivory px-4 py-3 pr-10 text-sm font-bold text-navy outline-none ring-mint/40 focus:ring-2"
                    />
                    <CalendarDays
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </span>
                </label>

                {!draft.timeUnknown && (
                  <label className="block w-[132px]">
                    <span className="mb-1 block text-xs font-black text-muted">
                      시간
                    </span>
                    <span className="relative block">
                      <input
                        type="time"
                        value={draft.birthTime}
                        onChange={(e) =>
                          patchDraft({ birthTime: e.target.value })
                        }
                        className="w-full rounded-2xl bg-ivory px-4 py-3 pr-9 text-sm font-bold text-navy outline-none ring-mint/40 focus:ring-2"
                      />
                      <Clock3
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                    </span>
                  </label>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-muted">
                <input
                  type="checkbox"
                  checked={draft.timeUnknown}
                  onChange={(e) =>
                    patchDraft({
                      timeUnknown: e.target.checked,
                      birthTime: e.target.checked ? '' : draft.birthTime,
                    })
                  }
                  className="h-4 w-4 rounded border-navy/20 accent-mint"
                />
                시간 모름
              </label>

              <Toggle
                options={[
                  { value: 'M' as const, label: '남성' },
                  { value: 'F' as const, label: '여성' },
                ]}
                value={draft.gender}
                onChange={(gender) => patchDraft({ gender })}
              />

              <Toggle
                options={[
                  { value: 'solar', label: '양력' },
                  { value: 'lunar', label: '음력' },
                ]}
                value={draft.isLunar ? 'lunar' : 'solar'}
                onChange={(calendar) =>
                  patchDraft({
                    isLunar: calendar === 'lunar',
                    isLeapMonth:
                      calendar === 'lunar' ? draft.isLeapMonth : false,
                  })
                }
              />

              {draft.isLunar && (
                <label className="flex items-center gap-2 text-xs font-bold text-muted">
                  <input
                    type="checkbox"
                    checked={draft.isLeapMonth}
                    onChange={(e) =>
                      patchDraft({ isLeapMonth: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-navy/20 accent-mint"
                  />
                  윤달
                </label>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="h-12 flex-1 rounded-2xl border border-navy/10 bg-white text-sm font-black text-muted"
                >
                  취소
                </button>
                <ButtonPrimary
                  tone="mint"
                  onClick={saveDraft}
                  disabled={saving}
                  className="h-12 flex-[1.4]"
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <Save size={16} strokeWidth={3} />
                    {saving ? '저장 중...' : '저장'}
                  </span>
                </ButtonPrimary>
              </div>
            </div>
          </Card>
        )}

        {error && (
          <p className="mt-4 rounded-2xl bg-red/10 px-4 py-3 text-center text-xs font-black text-red">
            {error}
          </p>
        )}

        <section className="mt-5 space-y-3">
          {loading ? (
            <Card className="p-6 text-center text-sm font-black text-muted">
              인원을 불러오는 중...
            </Card>
          ) : profiles.length === 0 ? (
            <Card className="p-7 text-center">
              <Badge tone="mint">등록된 인원 없음</Badge>
              <p className="mt-3 text-sm font-bold text-muted">
                등록 버튼으로 내 사주부터 만들어줘.
              </p>
            </Card>
          ) : (
            profiles.map((profile) => (
              <Card key={profile.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                      profile.relation_type === 'self'
                        ? 'bg-mint/20 text-[#17726D]'
                        : 'bg-gold/30 text-navy'
                    }`}
                  >
                    {profile.relation_type === 'self' ? (
                      <UserRound size={22} strokeWidth={2.6} />
                    ) : (
                      <UsersRound size={22} strokeWidth={2.6} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-black text-navy">
                        {profile.name}
                      </p>
                      <Badge
                        tone={
                          profile.relation_type === 'self' ? 'mint' : 'gold'
                        }
                        className="px-2 py-1 text-[10px]"
                      >
                        {profile.relation_label ||
                          RELATION_LABELS[profile.relation_type]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
                      {profileSubtitle(profile)}
                    </p>
                    {profile.palja?.day && (
                      <p className="mt-1 text-xs font-black text-navy">
                        일주{' '}
                        <span className="font-hanja">
                          {profile.palja.day.ganHanja}
                          {profile.palja.day.jiHanja}
                        </span>{' '}
                        · {profile.palja.day.gan}
                        {profile.palja.day.ji}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(profile)}
                    className="h-11 rounded-2xl bg-mint/15 text-sm font-black text-navy"
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <Pencil size={15} strokeWidth={3} />
                      수정
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteProfile(profile)}
                    disabled={deletingId === profile.id}
                    className="h-11 rounded-2xl bg-red/10 text-sm font-black text-red disabled:opacity-60"
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <Trash2 size={15} strokeWidth={3} />
                      {deletingId === profile.id ? '삭제 중...' : '삭제'}
                    </span>
                  </button>
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
