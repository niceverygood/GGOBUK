import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import type { SajuProfileRow, RelationRow } from '@/types/db';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompatPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rel } = await supabase
    .from('relations')
    .select('*, saju_b:saju_profiles!relations_saju_b_id_fkey(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<RelationRow & { saju_b: SajuProfileRow }>();
  if (!rel) notFound();

  const compat = rel.compatibility;

  return (
    <main className="px-5 pt-8 pb-12">
      <Link href="/relations" className="text-xs opacity-60">
        ← 인연
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{rel.saju_b.name}와의 궁합</h1>
      <p className="text-xs opacity-60 mt-1">{rel.saju_b.relation_label ?? '미지정'}</p>

      {compat ? (
        <>
          <div className="mt-6 rounded-3xl bg-white shadow-sm p-6 text-center">
            <div className="text-xs opacity-60">궁합 점수</div>
            <div className="text-6xl font-bold text-[var(--color-shell-dark)] mt-2">{compat.score}</div>
          </div>

          <section className="mt-6">
            <div className="text-sm font-semibold mb-2">요약</div>
            <p className="rounded-2xl bg-white p-4 shadow-sm text-sm leading-relaxed">{compat.summary}</p>
          </section>

          {compat.hap.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">합</div>
              <ul className="space-y-1 text-sm">
                {compat.hap.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>
            </section>
          )}
          {compat.chung.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">충</div>
              <ul className="space-y-1 text-sm">
                {compat.chung.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </section>
          )}
          {compat.highlights.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">잘 맞는 점</div>
              <ul className="space-y-1 text-sm">
                {compat.highlights.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>
            </section>
          )}
          {compat.cautions.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">주의할 점</div>
              <ul className="space-y-1 text-sm">
                {compat.cautions.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm opacity-60">아직 궁합이 계산되지 않았어.</p>
      )}
    </main>
  );
}
