import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, Card, FortuneChip } from '@/components/ui/primitives';
import { todayKstIso, formatKoreanDate } from '@/lib/utils/date';
import { calculatePalja } from '@/lib/saju/palja';

const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function moodPhrase(mood: string | null): string {
  switch (mood) {
    case 'happy':
      return '활기차게 풀리는 날';
    case 'calm':
      return '느긋하지만 감 좋은 날';
    case 'focused':
      return '집중력이 차오르는 날';
    case 'cautious':
      return '한 번 더 점검해야 할 날';
    default:
      return '평온한 흐름이야';
  }
}

function rough길운(daily: { mood: string | null } | null): number {
  if (!daily) return 60;
  switch (daily.mood) {
    case 'happy':
      return 88;
    case 'focused':
      return 78;
    case 'calm':
      return 70;
    case 'cautious':
      return 55;
    default:
      return 65;
  }
}

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

  // Today's 일진 for the header
  const ilji = calculatePalja({ birthDate: today, isLunar: false, gender: 'M' }).day;
  const todayDate = new Date(today + 'T00:00:00');
  const weekday = WEEKDAY[todayDate.getDay()];

  const gilun = rough길운(daily);
  const mood = daily?.mood ?? 'calm';

  return (
    <main className="px-5 pt-8 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-muted">{formatKoreanDate(today)} {weekday}</p>
            <h1 className="mt-1 text-xl font-black text-navy">
              {ilji.gan}{ilji.ji}일 <span className="font-hanja ml-1">{ilji.ganHanja}{ilji.jiHanja}日</span>
            </h1>
          </div>
          <Badge tone="mint">길운 {gilun}</Badge>
        </div>

        <Card className="mt-5 p-5 text-center">
          <div className="flex justify-center">
            <KkobukAvatar size="lg" mood={mood as 'happy' | 'calm' | 'focused' | 'cautious'} />
          </div>
          <p className="mt-2 text-xs font-extrabold text-muted">오늘의 꼬북이 표정</p>
          <h2 className="mt-1 text-xl font-black text-navy">{moodPhrase(daily?.mood ?? null)}</h2>
        </Card>

        <Card className="mt-4 p-4">
          <p className="text-xs font-extrabold text-muted">오늘의 한 줄</p>
          <p className="mt-1 text-lg font-black text-navy leading-snug">
            {daily?.one_liner ?? '오늘의 운세를 가져오는 중이야...'}
          </p>
        </Card>

        {daily && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <FortuneChip icon="🤍" label="컬러" value={daily.lucky_color ?? '-'} />
            <FortuneChip icon={daily.lucky_number ?? '-'} label="숫자" value="행운수" />
            <FortuneChip icon="↗" label="방향" value={daily.lucky_direction ?? '-'} />
          </div>
        )}

        {daily && (
          <Card className="mt-4 p-4">
            <p className="text-sm font-black text-navy mb-3">추천 행동</p>
            <div className="space-y-2 text-sm font-bold text-[#3C4650]">
              {(daily.recommend ?? []).map((r: string) => (
                <p key={r}>✓ {r}</p>
              ))}
              {(daily.avoid ?? []).map((a: string) => (
                <p key={a} className="text-red">! {a}</p>
              ))}
            </div>
          </Card>
        )}

        <Link
          href="/shell"
          className="mt-6 block w-full rounded-2xl bg-navy text-white text-center py-4 font-black shadow-[0_14px_26px_rgba(44,62,80,0.22)]"
        >
          내 등껍질 자세히 보기
        </Link>
      </div>

      <Link
        href="/chat"
        className="fixed right-5 bottom-24 w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center text-2xl shadow-[0_14px_26px_rgba(44,62,80,0.24)] z-20"
        aria-label="꼬북이와 대화"
      >
        🐢
      </Link>
    </main>
  );
}
