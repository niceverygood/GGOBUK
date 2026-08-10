import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { FullReadingPanel } from '@/components/shell/FullReadingPanel';
import { Badge, Card } from '@/components/ui/primitives';
import { iljuProfileOf } from '@/lib/saju/ilju_profile';
import { READING_CATEGORY, READING_PERSONA } from '@/lib/llm/interpret';
import type { Palja } from '@/lib/saju/types';

// 캐시된 풀이/생성 시각이 요청마다 fresh 해야 한다.
export const dynamic = 'force-dynamic';

function generatedLabelOf(generatedAt: string | null): string | null {
  if (!generatedAt) return null;
  const days = Math.floor(
    (Date.now() - new Date(generatedAt).getTime()) / 86400000,
  );
  if (days <= 0) return '오늘 생성';
  if (days === 1) return '어제 생성';
  if (days < 7) return `${days}일 전 생성`;
  if (days < 30) return `${Math.floor(days / 7)}주 전 생성`;
  return `${Math.floor(days / 30)}개월 전 생성`;
}

/**
 * 내 사주 — 등껍질 만세력 + 일주 카드 + 전체 풀이 한 편.
 * v2 단순화: 12개 카테고리 그리드·운세 도구 링크 제거, 문서 하나로 통합.
 */
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

  const palja = profile.palja as Palja;
  const ilju = iljuProfileOf(palja.day.ganIdx, palja.day.jiIdx);

  const { data: cached } = await supabase
    .from('interpretations')
    .select('content, generated_at')
    .eq('saju_id', profile.id)
    .eq('category', READING_CATEGORY)
    .eq('persona', READING_PERSONA)
    .maybeSingle();

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted"
        >
          <ArrowLeft size={14} strokeWidth={2.6} />홈
        </Link>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-muted">나의 만세력</p>
            <h1 className="text-2xl font-black tracking-tight text-navy">
              내 사주
            </h1>
          </div>
          <Badge tone="mint">일간 {palja.day.ganOhaeng}</Badge>
        </div>

        <div className="mt-6 flex justify-center">
          <TortoiseShell palja={palja} activePosition="일간" />
        </div>

        {ilju && (
          <Card className="mt-4 p-4 bg-gradient-to-br from-mint/15 via-white to-gold/15">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-navy">
                {ilju.name} 일주 <span className="font-hanja">{ilju.hanja}</span>
              </p>
              <span className="rounded-full bg-mint/25 px-2.5 py-1 text-[10px] font-black text-[#16706B]">
                60갑자 {ilju.index + 1}번째
              </span>
            </div>
            <p className="mt-2 text-sm font-bold leading-relaxed text-navy">
              {ilju.ego}
            </p>
            <div className="mt-3 -mx-1 flex flex-wrap gap-1.5">
              {ilju.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-black text-navy border border-navy/8"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </Card>
        )}

        <section className="mt-8">
          <p className="text-xs font-extrabold text-muted">꼬북이의 풀이</p>
          <h2 className="mt-1 text-xl font-black text-navy">전체 풀이</h2>
          <Card className="mt-3 p-5">
            <FullReadingPanel
              initialContent={cached?.content ?? ''}
              generatedLabel={generatedLabelOf(cached?.generated_at ?? null)}
            />
          </Card>
        </section>
      </div>
    </main>
  );
}
