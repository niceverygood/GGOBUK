import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Card } from '@/components/ui/primitives';
import {
  InterpretationEvidence,
  type InterpretationEvidenceProfile,
} from '@/components/shell/InterpretationEvidence';
import { InterpretationPanel } from '@/components/shell/InterpretationPanel';
import {
  PERSONAS,
  PERSONA_EXPERTISE_LEVEL,
  type PersonaKey,
} from '@/lib/llm/personas';
import { isPersonaKey } from '@/lib/utils/persona-mode';
import type { InterpretationCategory } from '@/types/db';

// 페르소나가 사주풀이를 어떻게 풀어주는지 한 단락 설명.
const PERSONA_INTERP_DESCRIPTION: Record<
  PersonaKey,
  { headline: string; body: string; bullets: string[] }
> = {
  kkobuk: {
    headline: '쉽고 친근한 친구처럼',
    body:
      '한자나 어려운 명리 용어 없이, 일상 단어로 풀어줘요. "비견" 같은 술어 대신 "너랑 비슷한 결의 사람"처럼 친구가 옆에서 설명해주는 듯한 톤이에요.',
    bullets: [
      '한자 ❌ · 명리 술어 일상어로 풀이',
      '흐르는 평문 (표·헤딩 없음)',
      '끝에 오늘 해볼 작은 행동 한 가지',
    ],
  },
  mudang: {
    headline: '단도직입 결단형',
    body:
      '결론부터 던지고 이유는 한 줄. "이건 해, 이건 미뤄" 식의 명확한 방향과 시점·데드라인 박힌 행동 지시로 빠른 진단을 줘요.',
    bullets: [
      '한자 ❌ · 술어 한 줄 풀이만',
      '짧은 단락 4–5개, 결단형 리듬',
      '"이번 주 안에 OO 정리해" 식 행동 지시',
    ],
  },
  bosal: {
    headline: '따뜻한 위로로 감싸며',
    body:
      '공감 먼저, 사주는 위로의 배경으로. 약점도 잠재력으로 다시 비춰주고 마지막에 오늘 해볼 작은 친절 한 가지를 권유 어조로 건네요.',
    bullets: [
      '핵심 한자만 살짝, 술어는 위로에 녹임',
      '평문 4–5단락, 공감 우선',
      '약점도 잠재력으로 reframe',
    ],
  },
  dosa: {
    headline: '명리 정식 풀이',
    body:
      '한자(漢字) 정식 병기와 격국·용신·통근·합충·십이운성을 깊이 인용하는 전문가용 풀이. 판독 근거 표·체크포인트·활용 처방까지 4-섹션 정식 리포트.',
    bullets: [
      '한자(漢字) 정식 병기 · 명리 술어 자유롭게',
      '판독 근거 표 + 체크포인트 + 깊은 풀이 + 활용 처방',
      '시점이 박힌 예언 + 양가성 한 줄 필수',
    ],
  },
};

const PERSONA_SPRITE: Record<
  PersonaKey,
  'persona-kkobuk' | 'persona-dosa' | 'persona-mudang' | 'persona-bosal'
> = {
  kkobuk: 'persona-kkobuk',
  dosa: 'persona-dosa',
  mudang: 'persona-mudang',
  bosal: 'persona-bosal',
};

const PERSONA_BG: Record<PersonaKey, string> = {
  kkobuk: 'from-mint/22 via-white to-gold/10 border-mint/35',
  mudang: 'from-red/12 via-white to-gold/12 border-red/30',
  bosal: 'from-gold/18 via-white to-mint/12 border-gold/40',
  dosa: 'from-navy/10 via-white to-mint/10 border-navy/25',
};

// Cookie-driven persona mode 결정 + supabase 인증 사용자별 캐시 — 반드시
// 매 요청마다 fresh render. RSC 캐시가 옛 persona 콘텐츠를 들고있지 않게.
export const dynamic = 'force-dynamic';

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
    .select('id,palja,ohaeng_count,sipsung,sinsal,ilgan')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<InterpretationEvidenceProfile & { id: string }>();
  if (!profile) redirect('/onboarding/saju');

  const cookieStore = await cookies();
  const personaRaw = cookieStore.get('ggobuk_persona_mode')?.value ?? 'dosa';
  const persona: PersonaKey = isPersonaKey(personaRaw) ? personaRaw : 'dosa';

  const { data: cached } = await supabase
    .from('interpretations')
    .select('content, generated_at')
    .eq('saju_id', profile.id)
    .eq('category', category)
    .eq('persona', persona)
    .maybeSingle();

  const personaMeta = PERSONAS[persona];
  const modeDesc = PERSONA_INTERP_DESCRIPTION[persona];
  const expertise = PERSONA_EXPERTISE_LEVEL[persona];
  const expertiseLabel =
    expertise === 1 ? '입문' : expertise === 2 ? '일반' : expertise === 3 ? '중급' : '전문가';

  return (
    <main className="px-5 pt-8 pb-32 relative min-h-dvh">
      <div className="hanji-overlay" />
      <div className="relative">
        <Link href="/shell" className="text-xs font-bold text-muted">
          ← 등껍질
        </Link>

        <div className="mt-2 pr-28">
          <p className="text-xs font-extrabold text-muted">
            {personaMeta.displayName}의 풀이 · {personaMeta.toneLabel}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-navy">
            {cat.title}
          </h1>
        </div>

        {/* 선택된 모드 스타일 카드 — 사용자가 현재 어떤 톤으로 받게 되는지 명확하게 */}
        <Link
          href={`/mode?from=/shell/${category}`}
          prefetch
          className={`mt-4 block rounded-3xl border bg-gradient-to-br ${PERSONA_BG[persona]} p-4 shadow-[0_8px_18px_rgba(44,62,80,0.06)] transition active:scale-[0.99]`}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/85 shadow-sm">
              <KkobukSprite
                variant={PERSONA_SPRITE[persona]}
                size="md"
                ariaLabel={personaMeta.displayName}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-black text-navy">
                  {personaMeta.displayName} 모드
                </p>
                <span className="rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-black text-navy">
                  {'★'.repeat(expertise)}
                  <span className="text-navy/20">{'★'.repeat(4 - expertise)}</span>
                  {' '}
                  {expertiseLabel}
                </span>
              </div>
              <p className="mt-1 text-[12px] font-black text-mint-dark">
                {modeDesc.headline}
              </p>
              <p className="mt-1 text-[11.5px] font-bold leading-relaxed text-navy">
                {modeDesc.body}
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {modeDesc.bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-1.5 text-[11px] font-bold text-navy/90"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy/60" />
                <span className="leading-snug">{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-right text-[10px] font-black text-navy/60">
            탭하여 다른 모드 비교 →
          </p>
        </Link>

        <InterpretationEvidence
          profile={profile}
          category={category as InterpretationCategory}
        />

        <Card className="mt-4 p-5">
          {cached?.generated_at && (
            <InterpretationAgeBadge generatedAt={cached.generated_at} />
          )}
          <InterpretationPanel
            category={category as InterpretationCategory}
            initialContent={cached?.content ?? ''}
          />
        </Card>

        <Link
          href="/chat"
          prefetch
          className="mt-6 block w-full rounded-2xl bg-navy text-white text-center py-4 font-black shadow-[0_14px_26px_rgba(44,62,80,0.22)] active:scale-[0.99] transition"
        >
          {PERSONAS[persona].displayName}에게 더 물어보기
        </Link>
      </div>
    </main>
  );
}

/**
 * 풀이 카드 상단에 "n일 전 생성" timestamp 표시. 180일 이상이면 강조 색.
 * 사주아이·점신처럼 시점성 hook을 만드는 가벼운 장치.
 */
function InterpretationAgeBadge({ generatedAt }: { generatedAt: string }) {
  const days = Math.floor(
    (Date.now() - new Date(generatedAt).getTime()) / 86400000,
  );
  let label: string;
  let stale = false;
  if (days <= 0) label = '오늘 생성';
  else if (days === 1) label = '어제 생성';
  else if (days < 7) label = `${days}일 전 생성`;
  else if (days < 30) label = `${Math.floor(days / 7)}주 전 생성`;
  else if (days < 365) {
    label = `${Math.floor(days / 30)}개월 전 생성`;
    if (days >= 180) stale = true;
  } else {
    label = `${Math.floor(days / 365)}년 ${Math.floor((days % 365) / 30)}개월 전`;
    stale = true;
  }
  return (
    <div
      className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
        stale
          ? 'bg-red/10 text-red'
          : 'bg-ivory text-muted'
      }`}
    >
      <span>{stale ? '⏳' : '🕐'}</span>
      <span>{label}</span>
      {stale && <span className="ml-1 text-[9.5px] font-bold">· 다시 받아볼 시기</span>}
    </div>
  );
}
