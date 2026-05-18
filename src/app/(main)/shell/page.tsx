import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { CategoryGrid } from '@/components/shell/CategoryGrid';
import { Badge, Card } from '@/components/ui/primitives';
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

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-muted">나의 만세력</p>
            <h1 className="text-2xl font-black tracking-tight text-navy">등껍질 사주</h1>
          </div>
          <Badge tone="mint">일간 {palja.day.ganOhaeng}</Badge>
        </div>

        <div className="mt-6 flex justify-center">
          <TortoiseShell palja={palja} activePosition="일간" />
        </div>

        <Card className="mt-6 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-navy">
              일간 <span className="font-hanja">{palja.day.ganHanja}</span>
            </p>
            <span className="text-xs font-black text-[#F4D03F]">핵심</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#82786D]">
            {palja.day.gan}{palja.day.ganOhaeng === '화' ? ' — 작은 촛불 같은 정화. 주변을 밝히되 바람에는 예민한 타입이에요.' : ` — 일간 ${palja.day.gan}이 사주의 중심이에요.`}
          </p>
        </Card>

        <p className="mt-7 mb-3 text-sm font-black text-navy">풀이 카테고리</p>
        <CategoryGrid />
      </div>
    </main>
  );
}
