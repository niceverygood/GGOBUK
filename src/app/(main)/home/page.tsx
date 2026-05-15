import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { todayKstIso, formatKoreanDate } from '@/lib/utils/date';

export default async function HomePage() {
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

  const today = todayKstIso();
  const { data: daily } = await supabase
    .from('daily_fortunes')
    .select('*')
    .eq('saju_id', profile.id)
    .eq('date', today)
    .maybeSingle();

  return (
    <main className="px-5 pt-8 pb-12">
      <div className="text-xs opacity-60">{formatKoreanDate(today)}</div>
      <h1 className="mt-1 text-2xl font-bold">꼬북이의 하루</h1>

      <section className="mt-6 rounded-3xl bg-white shadow-sm p-6 flex items-center gap-5">
        <KkobukAvatar size="lg" mood={daily?.mood ?? 'calm'} />
        <div className="flex-1">
          <div className="text-sm opacity-60">오늘의 한마디</div>
          <p className="mt-1 text-lg font-medium leading-snug">
            {daily?.one_liner ?? '오늘의 운세를 가져오는 중이야...'}
          </p>
        </div>
      </section>

      {daily && (
        <section className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="opacity-60 text-xs">행운 컬러</div>
            <div className="mt-1 font-semibold">{daily.lucky_color}</div>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="opacity-60 text-xs">행운 숫자</div>
            <div className="mt-1 font-semibold">{daily.lucky_number}</div>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="opacity-60 text-xs">행운 방향</div>
            <div className="mt-1 font-semibold">{daily.lucky_direction}</div>
          </div>
        </section>
      )}

      {daily && (
        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs opacity-60 mb-2">추천 행동</div>
            <ul className="space-y-1 text-sm">
              {(daily.recommend ?? []).map((r: string) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs opacity-60 mb-2">조심할 것</div>
            <ul className="space-y-1 text-sm">
              {(daily.avoid ?? []).map((a: string) => (
                <li key={a}>· {a}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Link
        href="/shell"
        className="mt-8 block w-full rounded-2xl bg-[var(--color-shell-dark)] text-white text-center py-4 font-semibold shadow"
      >
        내 등껍질 자세히 보기
      </Link>
    </main>
  );
}
