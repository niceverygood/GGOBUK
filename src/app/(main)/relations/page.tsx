'use client';

import { useEffect, useState } from 'react';
import { RelationGraph, type GraphNode } from '@/components/relations/RelationGraph';
import { ohaengFromGan } from '@/lib/saju/ohaeng_from_gan';
import { Badge, Card, Toggle, ButtonPrimary } from '@/components/ui/primitives';

interface RelationRow {
  id: string;
  saju_b: { id: string; name: string; ilgan: string | null; relation_label: string | null };
  compatibility: { score: number } | null;
}

interface MeData {
  ilgan: string | null;
}

type Filter = 'all' | 'gilun' | 'distance';

export default function RelationsPage() {
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [me, setMe] = useState<MeData | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);

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
    const [r1, r2] = await Promise.all([fetch('/api/relations'), fetch('/api/me/profile')]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    setRelations(d1.relations ?? []);
    setMe({ ilgan: d2?.profile?.ilgan ?? null });
  }

  async function add() {
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
    if (!res.ok) return;
    const d = await res.json();
    await fetch('/api/relations/compat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saju_b_id: d.saju.id, relation_label: label }),
    });
    setAdding(false);
    setName('');
    setBirthDate('');
    setBirthTime('');
    setLabel('');
    await load();
  }

  const filtered = relations.filter((r) => {
    if (filter === 'all') return true;
    const s = r.compatibility?.score ?? 50;
    if (filter === 'gilun') return s >= 70;
    if (filter === 'distance') return s <= 45;
    return true;
  });

  const nodes: GraphNode[] = filtered.map((r) => ({
    id: r.id,
    name: r.saju_b.name,
    relationLabel: r.saju_b.relation_label,
    ohaeng: ohaengFromGan(r.saju_b.ilgan),
    score: r.compatibility?.score ?? null,
  }));

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-muted">관계의 합과 충</p>
            <h1 className="text-2xl font-black tracking-tight text-navy">인연 지도</h1>
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-navy text-white text-xs font-extrabold"
          >
            {adding ? '취소' : '＋ 추가'}
          </button>
        </div>

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
              <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
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
              disabled={!name || !birthDate || (!timeUnknown && !birthTime)}
            >
              추가하고 궁합 보기
            </ButtonPrimary>
          </Card>
        )}

        <div className="mt-5">
          {nodes.length > 0 ? (
            <RelationGraph selfOhaeng={ohaengFromGan(me?.ilgan ?? null)} nodes={nodes} />
          ) : (
            <Card className="p-8 text-center">
              <Badge tone="mint">인연 없음</Badge>
              <p className="mt-3 text-sm font-bold text-muted">
                위 ＋ 버튼으로 첫 인연을 추가해봐
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
