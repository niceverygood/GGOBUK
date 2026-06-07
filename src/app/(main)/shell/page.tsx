import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { CategoryGrid } from '@/components/shell/CategoryGrid';
import { Badge, Card } from '@/components/ui/primitives';
import { iljuProfileOf } from '@/lib/saju/ilju_profile';
import type { Palja } from '@/lib/saju/types';

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

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 pr-28">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-muted">나의 만세력</p>
            <h1 className="text-2xl font-black tracking-tight text-navy">등껍질 사주</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="mint">일간 {palja.day.ganOhaeng}</Badge>
          </div>
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/80 p-3">
                <p className="text-[10px] font-black text-mint-dark">강점</p>
                <p className="mt-1 text-[11px] font-bold text-navy leading-snug">
                  {ilju.strengths.join(' · ')}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3">
                <p className="text-[10px] font-black text-red">주의/그늘</p>
                <p className="mt-1 text-[11px] font-bold text-navy leading-snug">
                  {ilju.watch.join(' · ')}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-bold leading-relaxed text-muted">
              💞 {ilju.love}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-muted">
              💼 {ilju.career}
            </p>
          </Card>
        )}

        <p className="mt-7 mb-3 text-sm font-black text-navy">풀이 카테고리</p>
        <CategoryGrid />
      </div>
    </main>
  );
}
