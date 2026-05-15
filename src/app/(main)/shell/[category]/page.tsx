import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES, generateInterpretation } from '@/lib/llm/interpret';
import { buildSajuResult } from '@/lib/saju';
import type { InterpretationCategory } from '@/types/db';

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function InterpretationDetailPage({ params }: PageProps) {
  const { category } = await params;
  const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category);
  if (!cat) notFound();

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

  const { data: userRow } = await supabase.from('users').select('is_pro').eq('id', user.id).single();
  const isPro = !!userRow?.is_pro;
  const catIdx = INTERPRETATION_CATEGORIES.findIndex((c) => c.key === category);
  if (!isPro && catIdx >= 3) redirect('/more/pro');

  // Check cache
  const { data: cached } = await supabase
    .from('interpretations')
    .select('content')
    .eq('saju_id', profile.id)
    .eq('category', category)
    .maybeSingle();

  let content = cached?.content ?? '';
  if (!content) {
    // Generate fresh and persist (via service role to bypass RLS).
    const admin = await createServerClient({ admin: true });
    const saju = buildSajuResult({
      birthDate: profile.birth_date,
      birthTime: profile.birth_time ?? undefined,
      isLunar: profile.is_lunar,
      isLeapMonth: profile.is_leap_month,
      gender: profile.gender,
    });
    const r = await generateInterpretation(saju, category as InterpretationCategory, profile.name);
    content = r.content;
    await admin.from('interpretations').insert({
      saju_id: profile.id,
      category,
      content,
      model: r.model,
      tokens_used: r.tokensUsed,
    });
  }

  return (
    <main className="px-5 pt-8 pb-16">
      <Link href="/shell" className="text-xs opacity-60">
        ← 등껍질
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{cat.title}</h1>
      <p className="text-xs opacity-60 mt-1">{cat.prompt}</p>

      <article className="mt-6 leading-7 whitespace-pre-wrap text-[15px]">
        {content}
      </article>
    </main>
  );
}
