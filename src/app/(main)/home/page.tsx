import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Archive,
  CalendarCheck,
  HeartHandshake,
  MessageCircle,
  ScrollText,
  Sparkles,
  UserPlus,
  Waypoints,
} from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { KkobukSprite, moodToSprite } from '@/components/kkobuk/KkobukSprite';
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

const FEATURE_CARDS = [
  {
    href: '/shell',
    title: '등껍질 사주',
    subtitle: '총평 · 오행 · 십성 해설',
    badge: '기본',
    icon: ScrollText,
    className: 'bg-gradient-to-br from-mint/25 to-white',
  },
  {
    href: '/relations',
    title: '궁합 해설',
    subtitle: '인연 추가하고 AI 궁합 보기',
    badge: 'AI',
    icon: HeartHandshake,
    className: 'bg-gradient-to-br from-red/10 to-white',
  },
  {
    href: '/timeline',
    title: '대운 타임라인',
    subtitle: '10년 단위 큰 흐름',
    badge: '흐름',
    icon: Waypoints,
    className: 'bg-gradient-to-br from-[#DCEBFF] to-white',
  },
  {
    href: '/more/auspicious',
    title: '택일 찾기',
    subtitle: '이사 · 계약 · 시작일 추천',
    badge: '길일',
    icon: CalendarCheck,
    className: 'bg-gradient-to-br from-gold/30 to-white',
  },
  {
    href: '/chat',
    title: '꼬북 상담',
    subtitle: '연애 · 일 · 관계 질문',
    badge: '대화',
    icon: MessageCircle,
    className: 'bg-gradient-to-br from-mint/15 to-gold/20',
  },
  {
    href: '/library',
    title: '보관함',
    subtitle: '완료한 풀이 다시 보기',
    badge: '저장',
    icon: Archive,
    className: 'bg-gradient-to-br from-white to-navy/5',
  },
];

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
  const { count: relationCount } = await supabase
    .from('relations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  const { count: interpretationCount } = await supabase
    .from('interpretations')
    .select('id', { count: 'exact', head: true })
    .eq('saju_id', profile.id);

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
            <KkobukSprite variant={moodToSprite(mood)} size="lg" ariaLabel={`꼬북이 ${mood}`} />
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

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-muted">꼬북점 운세 도구</p>
              <h2 className="text-lg font-black text-navy">필요한 풀이 바로 열기</h2>
            </div>
            <Link href="/library" className="text-xs font-black text-mint-dark">
              보관함 →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {FEATURE_CARDS.map(({ href, title, subtitle, badge, icon: Icon, className }) => (
              <Link
                key={href}
                href={href}
                prefetch
                className={`min-h-[132px] rounded-3xl border border-navy/10 p-4 shadow-[0_10px_24px_rgba(44,62,80,0.06)] transition active:scale-[0.99] ${className}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/75 text-navy shadow-sm">
                    <Icon size={21} strokeWidth={2.4} />
                  </span>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-navy">
                    {badge}
                  </span>
                </div>
                <p className="mt-3 text-base font-black text-navy">{title}</p>
                <p className="mt-1 text-[11px] font-bold leading-tight text-muted">
                  {subtitle}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <Card className="mt-5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-mint/15 text-navy">
              <Sparkles size={21} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-navy">내 기록 요약</p>
              <p className="mt-0.5 text-xs font-bold text-muted">
                사주해설 {interpretationCount ?? 0}개 · 인연 {relationCount ?? 0}명 저장됨
              </p>
            </div>
            <Link href="/relations" className="shrink-0 rounded-full bg-navy px-3 py-2 text-xs font-black text-white">
              <span className="inline-flex items-center gap-1">
                <UserPlus size={13} strokeWidth={3} />
                추가
              </span>
            </Link>
          </div>
        </Card>

        <Link
          href="/shell"
          className="mt-6 block w-full rounded-2xl bg-navy text-white text-center py-4 font-black shadow-[0_14px_26px_rgba(44,62,80,0.22)]"
        >
          내 등껍질 자세히 보기
        </Link>
      </div>

      <Link
        href="/chat"
        className="fixed right-5 bottom-24 w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center shadow-[0_14px_26px_rgba(44,62,80,0.24)] z-20 overflow-visible"
        aria-label="꼬북이와 대화"
      >
        <KkobukSprite variant="persona-kkobuk" size="xs" ariaLabel="꼬북이와 대화" />
      </Link>
    </main>
  );
}
