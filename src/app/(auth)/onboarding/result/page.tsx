import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { Badge, Card } from '@/components/ui/primitives';
import type { Palja } from '@/lib/saju/types';

export default async function OnboardingResult() {
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
  const summary = [palja.year, palja.month, palja.day, palja.time]
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => `${p.ganHanja}${p.jiHanja}`)
    .join(' · ');

  return (
    <main className="min-h-dvh px-5 pt-12 pb-12 relative">
      <div className="hanji-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,208,63,0.38),transparent_42%)] pointer-events-none" />
      <div className="relative flex flex-col items-center text-center">
        <Badge tone="gold">새겨짐 완료</Badge>
        <h1 className="mt-3 text-2xl font-black text-navy leading-snug">
          사주팔자가 등껍질에<br />새겨졌어요
        </h1>

        <div className="mt-8 scale-110">
          <TortoiseShell palja={palja} activePosition="일간" />
        </div>

        <Card className="mt-10 px-5 py-4 text-left w-full max-w-md">
          <p className="text-sm font-black text-navy font-hanja">{summary}</p>
          <p className="mt-1 text-sm text-[#82786D] font-semibold">
            {profile.name}님의 등껍질이 완성됐어. 일간 {palja.day.gan}이 중심이야.
          </p>
        </Card>

        <Link
          href="/home"
          className="mt-10 block w-full max-w-md rounded-2xl bg-mint text-[#163438] text-center py-4 font-black shadow-[0_14px_26px_rgba(44,62,80,0.22)]"
        >
          꼬북점 시작하기
        </Link>
      </div>
    </main>
  );
}
