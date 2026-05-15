import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES, generateInterpretation } from '@/lib/llm/interpret';
import { buildSajuResult } from '@/lib/saju';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Card } from '@/components/ui/primitives';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
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

  const { data: cached } = await supabase
    .from('interpretations')
    .select('content')
    .eq('saju_id', profile.id)
    .eq('category', category)
    .maybeSingle();

  let content = cached?.content ?? '';
  if (!content) {
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
    <main className="px-5 pt-8 pb-28 relative min-h-dvh">
      <div className="hanji-overlay" />
      <div className="relative">
        <Link href="/shell" className="text-xs font-bold text-muted">
          ← 등껍질
        </Link>

        <div className="flex items-start justify-between mt-2">
          <div>
            <p className="text-xs font-extrabold text-muted">꼬북도사의 정식 풀이</p>
            <h1 className="text-2xl font-black tracking-tight text-navy">{cat.title}</h1>
          </div>
          <KkobukAvatar variant="dosa" size="md" />
        </div>

        <Card className="mt-4 p-5">
          <InterpretationBody text={content} />
        </Card>
      </div>

      <div className="fixed left-0 right-0 bottom-0 px-5 pb-6 pt-3 bg-gradient-to-t from-ivory via-ivory/95 to-transparent max-w-md mx-auto">
        <Link
          href="/chat"
          className="block w-full rounded-2xl bg-navy text-white text-center py-4 font-black shadow-[0_14px_26px_rgba(44,62,80,0.22)]"
        >
          꼬북도사에게 더 물어보기
        </Link>
      </div>
    </main>
  );
}
