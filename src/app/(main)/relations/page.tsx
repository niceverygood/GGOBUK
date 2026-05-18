'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RelationGraph,
  type GraphNode,
} from '@/components/relations/RelationGraph';
import { ohaengFromGan } from '@/lib/saju/ohaeng_from_gan';
import { Badge, Card, Toggle, ButtonPrimary } from '@/components/ui/primitives';
import type { Palja } from '@/lib/saju/types';

interface RelationRow {
  id: string;
  saju_b: {
    id: string;
    name: string;
    ilgan: string | null;
    relation_type?: string | null;
    relation_label: string | null;
    palja?: Palja | null;
  };
  compatibility: { score: number } | null;
}

interface MeData {
  ilgan: string | null;
  hasProfile: boolean;
}

type Filter = 'all' | 'gilun' | 'distance' | 'family' | 'lover';
type RelationType = 'family' | 'friend' | 'lover' | 'colleague' | 'other';
type AddStatus = 'idle' | 'saving' | 'compat';

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'gilun', label: '이번달 귀인 ★' },
  { value: 'distance', label: '거리 둘 사람' },
  { value: 'family', label: '가족' },
  { value: 'lover', label: '연인' },
];

const RELATION_TYPE_OPTIONS: Array<{ value: RelationType; label: string }> = [
  { value: 'friend', label: '친구' },
  { value: 'family', label: '가족' },
  { value: 'lover', label: '연인' },
  { value: 'colleague', label: '동료' },
  { value: 'other', label: '기타' },
];

function errorMessage(error: string): string {
  if (error === 'unauthorized') return '로그인이 필요해. 다시 로그인해줘.';
  if (error === 'no self profile')
    return '내 사주가 먼저 필요해. 등껍질을 만들고 나면 궁합을 볼 수 있어.';
  if (error === 'other not found')
    return '방금 추가한 인연을 찾지 못했어. 다시 시도해줘.';
  if (error === 'llm_not_configured') return 'AI 키 설정이 아직 안 되어 있어.';
  if (error === 'invalid_body') return '입력값을 다시 확인해줘.';
  return error || '궁합 생성에 실패했어. 잠시 후 다시 시도해줘.';
}

function scoreLabel(score: number | null): string {
  if (score == null) return '궁합 대기';
  if (score >= 85) return '아주 강한 인연';
  if (score >= 70) return '좋은 흐름';
  if (score <= 45) return '거리 조절';
  return '차분히 보기';
}

function scoreClass(score: number | null): string {
  if (score == null) return 'bg-navy/10 text-navy';
  if (score >= 70) return 'bg-mint/20 text-[#16706B]';
  if (score <= 45) return 'bg-red/15 text-red';
  return 'bg-gold/35 text-[#5A4A20]';
}

function relationLabel(row: RelationRow): string {
  return row.saju_b.relation_label?.trim() || '인연';
}

function isFamily(row: RelationRow): boolean {
  const label = relationLabel(row);
  return (
    row.saju_b.relation_type === 'family' ||
    /가족|엄마|아빠|부모|형|누나|언니|동생|자녀/.test(label)
  );
}

function isLover(row: RelationRow): boolean {
  const label = relationLabel(row);
  return (
    row.saju_b.relation_type === 'lover' ||
    /연인|애인|남친|여친|배우자|남편|아내|전 연인|전남친|전여친/.test(label)
  );
}

function filterTitle(filter: Filter): string {
  if (filter === 'gilun') return '이번달 귀인 ★';
  if (filter === 'distance') return '거리 둘 사람';
  if (filter === 'family') return '가족';
  if (filter === 'lover') return '연인';
  return '전체 인연';
}

export default function RelationsPage() {
  const router = useRouter();
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [me, setMe] = useState<MeData | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<AddStatus>('idle');
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [relationType, setRelationType] = useState<RelationType>('friend');
  const [label, setLabel] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [r1, r2] = await Promise.all([
      fetch('/api/relations'),
      fetch('/api/me/profile'),
    ]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    setRelations(d1.relations ?? []);
    setMe({
      ilgan: d2?.profile?.ilgan ?? null,
      hasProfile: Boolean(d2?.profile),
    });
  }

  async function add() {
    setError('');
    if (me && !me.hasProfile) {
      setError(errorMessage('no self profile'));
      return;
    }

    try {
      setAddStatus('saving');
      const res = await fetch('/api/saju/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          birthDate,
          birthTime: timeUnknown ? undefined : birthTime,
          isLunar: false,
          gender,
          relationType,
          relationLabel: label,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(typeof d.error === 'string' ? d.error : 'invalid_body');

      setAddStatus('compat');
      const compatRes = await fetch('/api/relations/compat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saju_b_id: d.saju.id, relation_label: label }),
      });
      const compatData = await compatRes.json().catch(() => ({}));
      if (!compatRes.ok)
        throw new Error(
          typeof compatData.error === 'string'
            ? compatData.error
            : 'compat failed',
        );

      setAdding(false);
      setName('');
      setBirthDate('');
      setBirthTime('');
      setRelationType('friend');
      setLabel('');
      await load();

      if (compatData.relationId) {
        router.push(`/relations/${compatData.relationId}`);
      }
    } catch (e) {
      setError(errorMessage(e instanceof Error ? e.message : ''));
    } finally {
      setAddStatus('idle');
    }
  }

  const filtered = relations.filter((r) => {
    if (filter === 'all') return true;
    const s = r.compatibility?.score ?? 50;
    if (filter === 'gilun') return s >= 70;
    if (filter === 'distance') return s <= 45;
    if (filter === 'family') return isFamily(r);
    if (filter === 'lover') return isLover(r);
    return true;
  });

  const summary = useMemo(() => {
    const good = relations.filter(
      (r) => (r.compatibility?.score ?? 0) >= 70,
    ).length;
    const caution = relations.filter(
      (r) => (r.compatibility?.score ?? 100) <= 45,
    ).length;
    const pending = relations.filter(
      (r) => r.compatibility?.score == null,
    ).length;
    return { good, caution, pending };
  }, [relations]);

  const nodes: GraphNode[] = filtered.map((r) => ({
    id: r.id,
    name: r.saju_b.name,
    relationLabel: r.saju_b.relation_label,
    relationType: r.saju_b.relation_type,
    ohaeng: ohaengFromGan(r.saju_b.ilgan),
    gan: r.saju_b.palja?.day.gan ?? r.saju_b.ilgan,
    ji: r.saju_b.palja?.day.ji,
    ganHanja: r.saju_b.palja?.day.ganHanja,
    jiHanja: r.saju_b.palja?.day.jiHanja,
    score: r.compatibility?.score ?? null,
  }));

  return (
    <main className="px-5 pt-8 pb-40 relative overflow-x-hidden">
      <div className="hanji-overlay" />
      <div className="relative mx-auto w-full max-w-[560px]">
        <div>
          <p className="text-xs font-extrabold text-muted">관계의 합과 충</p>
          <h1 className="mt-1 text-[34px] font-black tracking-tight text-navy">
            내 인연 지도
          </h1>
          <p className="mt-1 text-xs font-bold text-muted">
            귀인 {summary.good}명 · 거리 조절 {summary.caution}명
            {summary.pending > 0 ? ` · 생성 대기 ${summary.pending}명` : ''}
          </p>
        </div>

        <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-black transition ${
                filter === option.value
                  ? 'border-navy bg-navy text-white shadow-[0_10px_18px_rgba(44,62,80,0.16)]'
                  : 'border-navy/10 bg-white text-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {adding && (
          <Card className="mt-4 p-4 space-y-3">
            <div>
              <p className="text-sm font-black text-navy">새 인연 추가</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
                추가하면 바로 AI 궁합 리포트를 만들고 상세 화면으로 이동해.
              </p>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="w-full rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="관계 (예: 직장 동료, 친구)"
              className="w-full rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold"
            />
            <Toggle
              options={RELATION_TYPE_OPTIONS}
              value={relationType}
              onChange={setRelationType}
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="flex-1 rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold"
              />
              {!timeUnknown && (
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold"
                />
              )}
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-muted">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
              />
              시간 모름
            </label>
            <Toggle
              options={[
                { value: 'M' as const, label: '남성' },
                { value: 'F' as const, label: '여성' },
              ]}
              value={gender}
              onChange={setGender}
            />
            <ButtonPrimary
              tone="mint"
              onClick={add}
              disabled={
                addStatus !== 'idle' ||
                !name ||
                !birthDate ||
                (!timeUnknown && !birthTime)
              }
            >
              {addStatus === 'saving'
                ? '사주 계산 중...'
                : addStatus === 'compat'
                  ? 'AI가 궁합 보는 중...'
                  : '추가하고 궁합 보기'}
            </ButtonPrimary>
            {addStatus === 'compat' && (
              <p className="text-center text-xs font-bold text-muted leading-relaxed">
                프리미엄 궁합 리포트를 만드는 중이라 20초 정도 걸릴 수 있어.
              </p>
            )}
            {error && (
              <p className="text-center text-xs font-bold text-red leading-relaxed">
                {error}
              </p>
            )}
          </Card>
        )}

        <RelationGraph
          selfOhaeng={ohaengFromGan(me?.ilgan ?? null)}
          nodes={nodes}
          onAdd={() => {
            setError('');
            setAdding((v) => !v);
          }}
        />

        {filtered.length === 0 && (
          <Card className="mt-4 p-7 text-center">
            <Badge tone="mint">
              {relations.length > 0 ? '필터 결과 없음' : '인연 없음'}
            </Badge>
            <p className="mt-3 text-sm font-bold text-muted">
              {relations.length > 0
                ? '다른 필터로 바꿔서 다시 확인해봐.'
                : '지도 안의 + 버튼으로 첫 인연을 추가해봐.'}
            </p>
          </Card>
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-muted">
              {filterTitle(filter)}
            </h2>
            <span className="text-sm font-black text-mint-dark">
              {filtered.length}명
            </span>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
            {filtered.map((relation) => {
              const score = relation.compatibility?.score ?? null;
              const ohaeng = ohaengFromGan(relation.saju_b.ilgan);
              const day = relation.saju_b.palja?.day;
              return (
                <Link
                  key={relation.id}
                  href={`/relations/${relation.id}`}
                  className="flex min-w-[220px] items-center gap-3 rounded-3xl border border-navy/10 bg-white p-4 shadow-[0_10px_24px_rgba(44,62,80,0.07)] transition active:scale-[0.99]"
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black ${scoreClass(
                      score,
                    )}`}
                  >
                    {relation.saju_b.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black text-navy">
                      {relation.saju_b.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-muted">
                      {day?.ganHanja && day?.jiHanja ? (
                        <span className="font-hanja mr-1">
                          {day.ganHanja}
                          {day.jiHanja}
                        </span>
                      ) : null}
                      {ohaeng} · {scoreLabel(score)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
