'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Plus, Sparkles, Users } from 'lucide-react';
import { ohaengFromGan } from '@/lib/saju/ohaeng_from_gan';
import { Badge, Card, Toggle, ButtonPrimary } from '@/components/ui/primitives';

interface RelationRow {
  id: string;
  saju_b: {
    id: string;
    name: string;
    ilgan: string | null;
    relation_label: string | null;
  };
  compatibility: { score: number } | null;
}

interface MeData {
  ilgan: string | null;
  hasProfile: boolean;
}

type Filter = 'all' | 'gilun' | 'distance';
type AddStatus = 'idle' | 'saving' | 'compat';

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

function ohaengClass(ohaeng: string | null): string {
  if (ohaeng === '목') return 'bg-[#DFF1EF] text-[#245D59]';
  if (ohaeng === '화') return 'bg-red/15 text-red';
  if (ohaeng === '토') return 'bg-gold/35 text-[#5A4A20]';
  if (ohaeng === '금') return 'bg-white text-navy border border-navy/10';
  if (ohaeng === '수') return 'bg-navy text-white';
  return 'bg-navy/10 text-navy';
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
          relationType: 'friend',
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
    return true;
  });

  const summary = useMemo(() => {
    const good = relations.filter((r) => (r.compatibility?.score ?? 0) >= 70).length;
    const caution = relations.filter((r) => (r.compatibility?.score ?? 100) <= 45).length;
    const pending = relations.filter((r) => r.compatibility?.score == null).length;
    return { good, caution, pending };
  }, [relations]);

  return (
    <main className="px-5 pt-8 pb-36 relative">
      <div className="hanji-overlay" />
      <div className="relative mx-auto w-full max-w-[560px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-muted">관계의 합과 충</p>
            <h1 className="text-2xl font-black tracking-tight text-navy">
              인연 지도
            </h1>
          </div>
          <button
            onClick={() => {
              setError('');
              setAdding((v) => !v);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-navy text-white text-xs font-extrabold shadow-[0_10px_18px_rgba(44,62,80,0.18)]"
          >
            {adding ? (
              '취소'
            ) : (
              <>
                <Plus size={14} strokeWidth={3} />
                추가
              </>
            )}
          </button>
        </div>

        <Card soft className="mt-4 p-4">
          <div className="grid grid-cols-3 divide-x divide-navy/10 text-center">
            <div>
              <p className="text-[11px] font-extrabold text-muted">전체</p>
              <p className="mt-1 text-xl font-black text-navy">{relations.length}</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-muted">좋은 흐름</p>
              <p className="mt-1 text-xl font-black text-mint-dark">{summary.good}</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-muted">거리 조절</p>
              <p className="mt-1 text-xl font-black text-red">{summary.caution}</p>
            </div>
          </div>
          {summary.pending > 0 && (
            <p className="mt-3 rounded-2xl bg-gold/25 px-3 py-2 text-center text-[11px] font-extrabold text-[#5A4A20]">
              AI 궁합 생성 대기 {summary.pending}명
            </p>
          )}
        </Card>

        <div className="mt-4">
          <Toggle
            options={[
              { value: 'all' as const, label: '전체' },
              { value: 'gilun' as const, label: '이번달 귀인' },
              { value: 'distance' as const, label: '거리 둘 사람' },
            ]}
            value={filter}
            onChange={setFilter}
          />
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

        <div className="mt-5 space-y-3">
          {filtered.length > 0 ? (
            filtered.map((relation) => {
              const score = relation.compatibility?.score ?? null;
              const ohaeng = ohaengFromGan(relation.saju_b.ilgan);
              return (
                <Link
                  key={relation.id}
                  href={`/relations/${relation.id}`}
                  className="group block rounded-3xl border border-navy/10 bg-white/90 p-4 shadow-[0_10px_24px_rgba(44,62,80,0.07)] transition active:scale-[0.99] hover:border-mint/60 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint/15 text-navy">
                      <Users size={22} strokeWidth={2.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-black text-navy">
                          {relation.saju_b.name}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${ohaengClass(
                            ohaeng,
                          )}`}
                        >
                          {ohaeng ?? '미정'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-muted">
                        {relation.saju_b.relation_label || '인연'} · {scoreLabel(score)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`inline-flex min-w-14 items-center justify-center rounded-2xl px-2.5 py-2 text-sm font-black ${scoreClass(
                          score,
                        )}`}
                      >
                        {score == null ? <Sparkles size={16} strokeWidth={2.8} /> : score}
                      </div>
                      <ArrowRight
                        size={16}
                        strokeWidth={3}
                        className="ml-auto mt-1 text-muted transition group-hover:translate-x-0.5 group-hover:text-navy"
                      />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <Badge tone="mint">
                {relations.length > 0 ? '필터 결과 없음' : '인연 없음'}
              </Badge>
              <p className="mt-3 text-sm font-bold text-muted">
                {relations.length > 0
                  ? '다른 필터로 바꿔서 다시 확인해봐.'
                  : '위 추가 버튼으로 첫 인연을 추가해봐.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
