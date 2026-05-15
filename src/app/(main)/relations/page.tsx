'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';

interface RelationRow {
  id: string;
  saju_b: { id: string; name: string; ilgan: string | null; relation_label: string | null };
  compatibility: { score: number } | null;
}

export default function RelationsPage() {
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [adding, setAdding] = useState(false);
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
    const r = await fetch('/api/relations');
    const d = await r.json();
    setRelations(d.relations ?? []);
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

  return (
    <main className="px-5 pt-8 pb-12">
      <h1 className="text-2xl font-bold">인연의 등껍질</h1>
      <p className="text-xs opacity-60 mt-1">사람을 등록하면 궁합을 풀어줘</p>

      <button
        onClick={() => setAdding((v) => !v)}
        className="mt-5 w-full rounded-2xl bg-[var(--color-ink)] text-white py-3 text-sm font-semibold"
      >
        {adding ? '취소' : '＋ 새 인연 추가'}
      </button>

      {adding && (
        <div className="mt-4 space-y-3 rounded-3xl bg-white p-4 shadow-sm">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="w-full rounded-xl bg-[var(--color-paper)] px-3 py-2 text-sm"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="관계 (예: 직장 동료, 친구)"
            className="w-full rounded-xl bg-[var(--color-paper)] px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="flex-1 rounded-xl bg-[var(--color-paper)] px-3 py-2 text-sm"
            />
            {!timeUnknown && (
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="rounded-xl bg-[var(--color-paper)] px-3 py-2 text-sm"
              />
            )}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
            시간 모름
          </label>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setGender('M')}
              className={`flex-1 rounded-xl py-2 ${gender === 'M' ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-paper)]'}`}
            >
              남
            </button>
            <button
              onClick={() => setGender('F')}
              className={`flex-1 rounded-xl py-2 ${gender === 'F' ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-paper)]'}`}
            >
              여
            </button>
          </div>
          <button
            onClick={add}
            disabled={!name || !birthDate || (!timeUnknown && !birthTime)}
            className="w-full rounded-xl bg-[var(--color-shell-dark)] text-white py-2 text-sm font-semibold disabled:opacity-60"
          >
            추가하고 궁합 보기
          </button>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {relations.length === 0 && <p className="text-xs opacity-60">아직 등록한 인연이 없어.</p>}
        {relations.map((r) => (
          <li key={r.id}>
            <Link
              href={`/relations/${r.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
            >
              <KkobukAvatar variant="kkobuk" size="sm" />
              <div className="flex-1">
                <div className="font-semibold text-sm">{r.saju_b.name}</div>
                <div className="text-xs opacity-60">{r.saju_b.relation_label ?? '-'}</div>
              </div>
              {r.compatibility && (
                <div className="text-right">
                  <div className="text-xs opacity-60">궁합</div>
                  <div className="text-lg font-bold text-[var(--color-shell-dark)]">{r.compatibility.score}</div>
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
