'use client';

import { useState } from 'react';
import { Card, Toggle, ButtonPrimary, Badge } from '@/components/ui/primitives';
import { RelationGraph, type GraphNode } from '@/components/relations/RelationGraph';
import { computePreview } from '@/lib/saju/preview';
import { quickCompat } from '@/lib/saju/quick_compat';
import { ohaengFromGan } from '@/lib/saju/ohaeng_from_gan';
import type { Palja, SajuResult } from '@/lib/saju/types';

interface Partner {
  id: string;
  name: string;
  label: string;
  saju: SajuResult;
  score: number;
  hap: string[];
  chung: string[];
}

export function PartnerCompare({ selfSaju, selfName }: { selfSaju: SajuResult; selfName: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Partner | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [label, setLabel] = useState('친구');
  const [birthDate, setBirthDate] = useState('1990-05-20');
  const [birthTime, setBirthTime] = useState('09:30');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<'M' | 'F'>('F');
  const [err, setErr] = useState<string | null>(null);

  function addPartner() {
    setErr(null);
    if (!name.trim() || !birthDate) {
      setErr('이름과 생년월일은 필수야');
      return;
    }
    try {
      const partnerSaju = computePreview({
        birthDate,
        birthTime: timeUnknown ? undefined : birthTime,
        isLunar: false,
        gender,
      });
      const { score, hap, chung } = quickCompat(selfSaju.palja as Palja, partnerSaju.palja as Palja);
      const newPartner: Partner = {
        id: `p-${Date.now()}`,
        name: name.trim(),
        label: label.trim() || '인연',
        saju: partnerSaju,
        score,
        hap,
        chung,
      };
      setPartners((prev) => [...prev, newPartner]);
      setSelected(newPartner);
      // reset form
      setName('');
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '계산 오류');
    }
  }

  function remove(id: string) {
    setPartners((p) => p.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const nodes: GraphNode[] = partners.map((p) => ({
    id: p.id,
    name: p.name,
    relationLabel: p.label,
    ohaeng: ohaengFromGan(p.saju.ilgan),
    score: p.score,
  }));

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-sm font-black text-navy">인연 비교</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-navy text-white text-xs font-extrabold"
        >
          {open ? '취소' : `＋ 사람 추가${partners.length ? ` (${partners.length})` : ''}`}
        </button>
      </div>

      {open && (
        <Card className="p-4 space-y-2.5 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold min-w-0"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="관계"
              className="rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold min-w-0"
            />
          </div>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold"
          />
          <div className="flex gap-2 items-center">
            {!timeUnknown && (
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="flex-1 min-w-0 rounded-xl bg-ivory px-3 py-2.5 text-sm font-bold"
              />
            )}
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted shrink-0">
              <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
              시간 모름
            </label>
          </div>
          <Toggle
            options={[
              { value: 'M' as const, label: '남성' },
              { value: 'F' as const, label: '여성' },
            ]}
            value={gender}
            onChange={setGender}
          />
          {err && <p className="text-xs text-red font-bold">{err}</p>}
          <ButtonPrimary tone="mint" onClick={addPartner}>
            추가하고 궁합 보기
          </ButtonPrimary>
        </Card>
      )}

      {partners.length === 0 ? (
        <Card soft className="p-5 text-center">
          <Badge tone="mint">데모</Badge>
          <p className="mt-2 text-xs font-bold text-muted">
            {selfName}와 비교할 사람을 추가하면 그래프와 합·충이 즉시 보여요.
          </p>
        </Card>
      ) : (
        <>
          <RelationGraph selfOhaeng={ohaengFromGan(selfSaju.ilgan)} nodes={nodes} />

          <div className="mt-3 space-y-2">
            {partners.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full text-left rounded-2xl border p-3 transition ${
                  selected?.id === p.id ? 'border-mint bg-mint/10' : 'border-navy/10 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-navy truncate">
                      {p.name} <span className="text-xs font-bold text-muted">· {p.label}</span>
                    </p>
                    <p className="text-[11px] font-bold text-muted truncate">
                      일주 <span className="font-hanja">{p.saju.palja.day.ganHanja}{p.saju.palja.day.jiHanja}</span> · 일간 {p.saju.ilgan}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-black leading-none text-mint-dark">{p.score}</div>
                    <div className="text-[10px] font-extrabold text-muted">궁합</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <Card className="mt-3 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-navy">
                  {selfName} ↔ {selected.name}
                </p>
                <button
                  onClick={() => remove(selected.id)}
                  className="text-[11px] font-extrabold text-red"
                >
                  삭제
                </button>
              </div>
              {selected.hap.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold text-[#27AE60] mb-1">합</p>
                  <ul className="space-y-0.5 text-xs font-bold text-navy">
                    {selected.hap.map((h) => (
                      <li key={h} className="font-hanja">· {h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.chung.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold text-red mb-1">충</p>
                  <ul className="space-y-0.5 text-xs font-bold text-navy">
                    {selected.chung.map((c) => (
                      <li key={c} className="font-hanja">· {c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.hap.length === 0 && selected.chung.length === 0 && (
                <p className="text-xs font-bold text-muted">
                  일주끼리 직접적인 합·충은 없어. 무난한 흐름이야.
                </p>
              )}
            </Card>
          )}
        </>
      )}
    </section>
  );
}
