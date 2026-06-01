'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Brain, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge, Card } from '@/components/ui/primitives';
import type { MemoryItem, MemoryKind } from '@/types/db';

const KIND_LABELS: Record<MemoryKind, string> = {
  fact: '사실',
  situation: '상황',
  preference: '취향',
  relationship: '인연',
  goal: '목표',
  emotion: '마음',
};

const KIND_TONE: Record<MemoryKind, 'mint' | 'gold' | 'navy'> = {
  fact: 'navy',
  situation: 'gold',
  preference: 'mint',
  relationship: 'gold',
  goal: 'navy',
  emotion: 'mint',
};

// ISO 문자열을 렌더 중 안전하게(순수) YYYY.MM.DD 로. new Date() 미사용.
function formatDate(iso: string): string {
  return iso.slice(0, 10).replaceAll('-', '.');
}

export default function MemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [clearing, setClearing] = useState(false);

  async function deleteItem(id: string) {
    setDeletingId(id);
    setError('');
    // 낙관적 제거 — 실패하면 되돌린다.
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/memory?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete_failed');
    } catch {
      setItems(prev);
      setError('삭제하지 못했어. 잠시 후 다시 시도해줘.');
    } finally {
      setDeletingId('');
    }
  }

  async function clearAll() {
    if (
      !window.confirm(
        '꼬북이가 너에 대해 기억하는 걸 전부 지울까? 되돌릴 수 없어.',
      )
    )
      return;
    setClearing(true);
    setError('');
    const prev = items;
    setItems([]);
    try {
      const res = await fetch('/api/memory', { method: 'DELETE' });
      if (!res.ok) throw new Error('clear_failed');
    } catch {
      setItems(prev);
      setError('전체 삭제에 실패했어. 잠시 후 다시 시도해줘.');
    } finally {
      setClearing(false);
    }
  }

  // 첫 진입 시 1회 로드. setState 는 await 이후에만 호출 → 동기 setState 회피.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/memory', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? 'load_failed');
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setError('기억을 불러오지 못했어. 잠시 후 다시 시도해줘.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative px-5 pb-36 pt-7">
      <div className="hanji-overlay" />
      <div className="relative mx-auto w-full max-w-[560px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/more"
              className="inline-flex items-center gap-1 text-xs font-black text-muted"
            >
              <ArrowLeft size={14} strokeWidth={3} />
              더보기
            </Link>
            <h1 className="mt-2 inline-flex items-center gap-2 text-[30px] font-black tracking-tight text-navy">
              <Brain size={26} strokeWidth={2.6} />
              꼬북이의 기억
            </h1>
            <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
              꼬북이가 너와 나눈 대화에서 기억해 둔 것들이야. 틀렸거나 지우고
              싶은 건 언제든 삭제할 수 있어.
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void clearAll()}
              disabled={clearing}
              className="shrink-0 rounded-full bg-red/10 px-4 py-2.5 text-xs font-black text-red disabled:opacity-60"
            >
              {clearing ? '지우는 중...' : '전체 삭제'}
            </button>
          )}
        </div>

        <Card soft className="mt-4 p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck
              size={17}
              strokeWidth={2.6}
              className="mt-0.5 shrink-0 text-[#17726D]"
            />
            <p className="text-xs font-bold leading-relaxed text-muted">
              건강·종교·정치 같은 민감한 정보나 사주 계산 결과는 기억하지 않아.
              여기 있는 기억은 꼬북이가 너를 더 잘 이해하려고 쓰는 거야.
            </p>
          </div>
        </Card>

        {error && (
          <p className="mt-4 rounded-2xl bg-red/10 px-4 py-3 text-center text-xs font-black text-red">
            {error}
          </p>
        )}

        <section className="mt-5 space-y-2.5">
          {loading ? (
            <Card className="p-6 text-center text-sm font-black text-muted">
              기억을 불러오는 중...
            </Card>
          ) : items.length === 0 ? (
            <Card className="p-7 text-center">
              <Badge tone="mint">아직 기억이 없어</Badge>
              <p className="mt-3 text-sm font-bold leading-relaxed text-muted">
                꼬북이랑 대화를 나누다 보면 너에 대해 차차 기억하게 될 거야.
              </p>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={KIND_TONE[item.kind]}
                        className="px-2 py-1 text-[10px]"
                      >
                        {KIND_LABELS[item.kind] ?? item.kind}
                      </Badge>
                      <span className="text-[10px] font-bold text-muted">
                        {formatDate(item.lastSeenAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-black leading-relaxed text-navy">
                      {item.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteItem(item.id)}
                    disabled={deletingId === item.id}
                    aria-label="이 기억 삭제"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red/10 text-red disabled:opacity-60"
                  >
                    <Trash2 size={16} strokeWidth={2.8} />
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
