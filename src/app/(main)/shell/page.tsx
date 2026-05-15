import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { OhaengChart } from '@/components/shell/OhaengChart';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import type { Palja, OhaengCount } from '@/lib/saju/types';

export default async function ShellPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) redirect('/onboarding/saju');

  const { data: userRow } = await supabase
    .from('users')
    .select('is_pro')
    .eq('id', user.id)
    .single();
  const isPro = !!userRow?.is_pro;

  const palja = profile.palja as Palja;
  const counts = profile.ohaeng_count as OhaengCount;

  return (
    <main className="px-5 pt-8 pb-12">
      <h1 className="text-2xl font-bold">{profile.name}님의 등껍질</h1>
      <p className="text-xs opacity-60 mt-1">탭하면 그 자리의 뜻이 보여요</p>

      <div className="mt-6">
        <TortoiseShell palja={palja} />
      </div>

      <section className="mt-8 rounded-3xl bg-white shadow-sm p-5">
        <div className="text-sm font-semibold mb-3">오행 분포</div>
        <OhaengChart counts={counts} total={palja.time ? 8 : 6} />
      </section>

      <section className="mt-8">
        <div className="text-sm font-semibold mb-3">12가지 풀이</div>
        <div className="grid grid-cols-2 gap-3">
          {INTERPRETATION_CATEGORIES.map((cat, i) => {
            const locked = !isPro && i >= 3;
            return (
              <Link
                key={cat.key}
                href={locked ? '/more/pro' : `/shell/${cat.key}`}
                className={`rounded-2xl bg-white p-4 shadow-sm relative ${locked ? 'opacity-60' : ''}`}
              >
                <div className="text-sm font-semibold">{cat.title}</div>
                <div className="text-xs opacity-60 mt-1 line-clamp-2">{cat.prompt}</div>
                {locked && (
                  <div className="absolute top-2 right-2 text-[10px] bg-[var(--color-gold)] text-[var(--color-ink)] px-2 py-0.5 rounded-full font-semibold">
                    Pro
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
