import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RegenerateCompatibilityButton } from '@/components/relations/RegenerateCompatibilityButton';
import { RelationDeleteButton } from '@/components/relations/RelationDeleteButton';
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
  const hap = Array.isArray(compat?.hap) ? compat.hap : [];
  const chung = Array.isArray(compat?.chung) ? compat.chung : [];
  const highlights = Array.isArray(compat?.highlights) ? compat.highlights : [];
  const cautions = Array.isArray(compat?.cautions) ? compat.cautions : [];
  const sections = Array.isArray(compat?.sections)
    ? compat.sections.filter((s) => s.title && s.body)
    : [];
  const actionTips = Array.isArray(compat?.actionTips) ? compat.actionTips : [];

  return (
    <main className="px-5 pt-8 pb-32">
      <Link href="/relations" className="text-xs opacity-60">
        ← 인연
      </Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">
            {rel.saju_b.name}와의 궁합
          </h1>
          <p className="mt-1 text-xs opacity-60">
            {rel.saju_b.relation_label ?? '미지정'}
          </p>
        </div>
        <RelationDeleteButton
          relationId={rel.id}
          relationName={rel.saju_b.name}
          redirectTo="/relations"
        />
      </div>

      {compat ? (
        <>
          <div className="mt-6 rounded-3xl bg-white shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-muted">
                  궁합 점수
                </div>
                <div className="mt-1 text-6xl font-black text-[var(--color-shell-dark)]">
                  {compat.score}
                </div>
              </div>
              <div className="rounded-full bg-gold/50 px-3 py-1.5 text-xs font-black text-navy">
                AI 리포트
              </div>
            </div>
            {compat.headline && (
              <h2 className="mt-5 text-xl font-black leading-snug text-navy">
                {compat.headline}
              </h2>
            )}
            {compat.verdict && (
              <p className="mt-3 text-sm font-bold leading-relaxed text-navy">
                {compat.verdict}
              </p>
            )}
            {compat.metaphor && (
              <p className="mt-3 rounded-2xl bg-mint/10 p-4 text-sm font-bold leading-relaxed text-[#52615B]">
                {compat.metaphor}
              </p>
            )}
          </div>

          <RegenerateCompatibilityButton
            sajuBId={rel.saju_b.id}
            relationLabel={rel.saju_b.relation_label}
            hasCompatibility
          />

          <section className="mt-6">
            <div className="text-sm font-semibold mb-2">요약</div>
            <p className="rounded-2xl bg-white p-4 shadow-sm text-sm leading-relaxed">
              {compat.summary}
            </p>
          </section>

          {sections.length > 0 && (
            <section className="mt-6 space-y-4">
              <div className="text-sm font-semibold">프리미엄 궁합 해설</div>
              {sections.map((section, index) => (
                <article
                  key={`${section.title}-${index}`}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="text-[11px] font-black text-mint">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-1 text-lg font-black leading-snug text-navy">
                    {section.title}
                  </h3>
                  <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-[#4F5B56]">
                    {section.body}
                  </p>
                </article>
              ))}
            </section>
          )}

          {actionTips.length > 0 && (
            <section className="mt-6">
              <div className="text-sm font-semibold mb-2">관계 개운 팁</div>
              <ul className="space-y-2">
                {actionTips.map((tip) => (
                  <li
                    key={tip}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-relaxed shadow-sm"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hap.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">합</div>
              <ul className="space-y-1 text-sm">
                {hap.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>
            </section>
          )}
          {chung.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">충</div>
              <ul className="space-y-1 text-sm">
                {chung.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </section>
          )}
          {highlights.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">잘 맞는 점</div>
              <ul className="space-y-1 text-sm">
                {highlights.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>
            </section>
          )}
          {cautions.length > 0 && (
            <section className="mt-5">
              <div className="text-sm font-semibold mb-2">주의할 점</div>
              <ul className="space-y-1 text-sm">
                {cautions.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <>
          <p className="mt-6 text-sm opacity-60">
            아직 궁합이 계산되지 않았어.
          </p>
          <RegenerateCompatibilityButton
            sajuBId={rel.saju_b.id}
            relationLabel={rel.saju_b.relation_label}
            hasCompatibility={false}
          />
        </>
      )}
    </main>
  );
}
