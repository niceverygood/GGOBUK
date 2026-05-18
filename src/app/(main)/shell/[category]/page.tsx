import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Card } from '@/components/ui/primitives';
import { BottomActionBar } from '@/components/nav/BottomActionBar';
import { InterpretationPanel } from '@/components/shell/InterpretationPanel';
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
    .select('id')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle();
  if (!profile) redirect('/onboarding/saju');

  const { data: cached } = await supabase
    .from('interpretations')
    .select('content')
    .eq('saju_id', profile.id)
    .eq('category', category)
    .maybeSingle();

  return (
    <main className="px-5 pt-8 pb-[14rem] relative min-h-dvh">
      <div className="hanji-overlay" />
      <div className="relative">
        <Link href="/shell" className="text-xs font-bold text-muted">
          ← 등껍질
        </Link>

        <div className="flex items-start justify-between mt-2">
          <div>
            <p className="text-xs font-extrabold text-muted">
              꼬북도사의 정식 풀이
            </p>
            <h1 className="text-2xl font-black tracking-tight text-navy">
              {cat.title}
            </h1>
          </div>
          <KkobukAvatar variant="dosa" size="md" />
        </div>

        <Card className="mt-4 p-5">
          <InterpretationPanel
            category={category as InterpretationCategory}
            initialContent={cached?.content ?? ''}
          />
        </Card>
      </div>

      <BottomActionBar>
        <Link
          href="/chat"
          className="block w-full rounded-2xl bg-navy text-white text-center py-4 font-black shadow-[0_14px_26px_rgba(44,62,80,0.22)]"
        >
          꼬북도사에게 더 물어보기
        </Link>
      </BottomActionBar>
    </main>
  );
}
