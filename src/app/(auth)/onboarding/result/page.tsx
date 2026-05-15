import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { TortoiseShell } from '@/components/shell/TortoiseShell';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
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

  return (
    <main className="min-h-dvh bg-[var(--color-paper)] text-[var(--color-ink)] px-5 py-10">
      <div className="flex flex-col items-center text-center">
        <KkobukAvatar size="lg" mood="happy" />
        <h1 className="mt-4 text-2xl font-bold">등껍질이 새겨졌어</h1>
        <p className="mt-2 text-sm opacity-70">
          {profile.name}님의 사주 8자야. 천천히 둘러봐.
        </p>
      </div>

      <div className="mt-8">
        <TortoiseShell palja={palja} />
      </div>

      <Link
        href="/home"
        className="mt-10 block w-full rounded-2xl bg-[var(--color-shell-dark)] text-white text-center py-4 font-semibold"
      >
        꼬북점 시작하기
      </Link>
    </main>
  );
}
