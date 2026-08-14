'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { KkobukSprite, moodToSprite } from '@/components/kkobuk/KkobukSprite';
import { Card } from '@/components/ui/primitives';
import { BREAD, CREDIT_UNIT } from '@/lib/credits';
import { track } from '@/lib/analytics/track';

export interface DailyFortuneView {
  one_liner: string;
  lucky_color: string | null;
  lucky_number: number | null;
  lucky_food: string | null;
  mood: string | null;
  recommend: string[];
}

interface Props {
  /** 서버에서 확인한 오늘 오픈 여부 */
  openedToday: boolean;
  /** 오늘 이미 열었다면 그 내용 */
  initialDaily: DailyFortuneView | null;
  /** 현재 사이클 도장 수 (0..6) */
  initialStamps: number;
  /** 오늘 오픈이 황금 거북빵이었는지 */
  initialGolden: boolean;
}

type Phase = 'idle' | 'baking' | 'opened' | 'error';

const BAKE_MS = 2200;

/**
 * 행운의 거북빵 — 매일 무료로 여는 하루 1회 의식.
 *
 * 별도 콘텐츠가 아니라 그날의 운세(daily_fortunes)를 여는 포장이다.
 * 굽는 연출이 첫 오픈 시의 LLM 생성 대기시간을 덮는다.
 */
export function TurtleBread({
  openedToday,
  initialDaily,
  initialStamps,
  initialGolden,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(openedToday ? 'opened' : 'idle');
  const [daily, setDaily] = useState<DailyFortuneView | null>(initialDaily);
  const [stamps, setStamps] = useState(initialStamps);
  const [golden, setGolden] = useState(initialGolden);
  const [reward, setReward] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // 보상을 받았으면 헤더 잔액 등 서버 상태를 갱신
  useEffect(() => {
    if (reward > 0) router.refresh();
  }, [reward, router]);

  async function bake() {
    if (phase === 'baking') return;
    setPhase('baking');
    setErrorMsg('');
    track('bread_open', { stamps });

    const startedAt = Date.now();
    try {
      const res = await fetch('/api/bread/open', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok && !data?.bread) {
        setErrorMsg(
          res.status === 412
            ? 'AI 사용에 먼저 동의해줘.'
            : '거북빵을 굽지 못했어. 잠깐 후 다시 시도해줘.',
        );
        setPhase('error');
        return;
      }

      // 굽는 연출은 최소 BAKE_MS 는 보여준다 (응답이 빨라도 뚝 끊기지 않게)
      const elapsed = Date.now() - startedAt;
      if (elapsed < BAKE_MS) {
        await new Promise((r) => setTimeout(r, BAKE_MS - elapsed));
      }

      if (data.bread) {
        setStamps(Number(data.bread.stamps ?? 0));
        setGolden(Boolean(data.bread.isGolden));
        setReward(Number(data.bread.rewardCredits ?? 0));
      }
      if (data.daily) setDaily(data.daily as DailyFortuneView);

      if (!data.daily) {
        setErrorMsg('오늘 운세를 못 가져왔어. 새로고침하면 다시 보여줄게.');
        setPhase('error');
        return;
      }
      setPhase('opened');
    } catch {
      setErrorMsg('연결이 불안정해. 잠깐 후 다시 시도해줘.');
      setPhase('error');
    }
  }

  return (
    <Card
      className={`mt-3 overflow-hidden p-5 ${
        golden
          ? 'bg-gradient-to-br from-gold/30 via-white to-gold/15 border-gold/50'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold text-muted">
            {golden ? '✨ 황금 거북빵' : '오늘의 거북빵'}
          </p>
          <h2 className="mt-0.5 text-[20px] font-black leading-tight text-navy">
            {phase === 'opened' ? '오늘의 운세가 나왔어' : '하루 한 번, 무료로 열어봐'}
          </h2>
        </div>
        <StampStrip stamps={stamps} />
      </div>

      {phase !== 'opened' && (
        <div className="mt-5 flex flex-col items-center">
          <div
            className={`grid h-28 w-28 place-items-center rounded-full bg-gold/20 ${
              phase === 'baking' ? 'animate-pulse' : ''
            }`}
          >
            <KkobukSprite variant="front" size="md" ariaLabel="거북빵" />
          </div>

          {phase === 'baking' ? (
            <p className="mt-4 text-sm font-black text-navy">
              거북빵 굽는 중...
              <span className="ml-1 font-bold text-muted">
                꼬북이가 오늘 기운을 반죽하고 있어
              </span>
            </p>
          ) : (
            <>
              <button
                onClick={bake}
                className="mt-5 w-full rounded-2xl bg-navy py-3.5 text-[15px] font-black text-white transition active:scale-[0.99]"
              >
                오늘의 거북빵 굽기
              </button>
              <p className="mt-2 text-[11px] font-bold text-muted">
                도장 {BREAD.stampsPerReward}개를 모으면 {BREAD.creditsPerReward}
                {CREDIT_UNIT}을 받아
              </p>
            </>
          )}

          {errorMsg && (
            <p className="mt-3 text-xs font-bold text-red">{errorMsg}</p>
          )}
        </div>
      )}

      {phase === 'opened' && daily && (
        <div className="mt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ivory px-4 py-3.5">
            {/* 그날 기운을 표정으로 — daily.mood 를 꼬북이 스프라이트로 매핑 */}
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/80">
              <KkobukSprite
                variant={moodToSprite(daily.mood)}
                size="sm"
                ariaLabel="오늘의 꼬북이"
              />
            </span>
            <p className="text-[15px] font-black leading-snug text-navy">
              {daily.one_liner}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <LuckyTile label="행운의 색" value={daily.lucky_color} />
            <LuckyTile
              label="행운의 숫자"
              value={daily.lucky_number != null ? String(daily.lucky_number) : null}
            />
            <LuckyTile label="행운의 음식" value={daily.lucky_food} />
          </div>

          {daily.recommend?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {daily.recommend.slice(0, 3).map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-1.5 text-[12.5px] font-bold leading-snug text-[#3C4650]"
                >
                  <span className="mt-0.5 shrink-0 text-mint-dark">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}

          {reward > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/20 px-3.5 py-2.5">
              <Sparkles size={16} strokeWidth={2.6} className="shrink-0 text-[#B58A00]" />
              <p className="text-[12.5px] font-black text-navy">
                {golden ? '황금 거북빵!' : '도장을 다 모았어!'} {reward}
                {CREDIT_UNIT} 적립됐어
              </p>
            </div>
          )}

          <p className="mt-3 text-[11px] font-bold text-mint-dark">
            오늘의 거북빵은 오늘만 · 내일 새 빵이 구워져
          </p>
        </div>
      )}
    </Card>
  );
}

function LuckyTile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-white/85 px-2 py-2.5 border border-navy/8">
      <p className="text-[10px] font-extrabold leading-none text-muted">{label}</p>
      <p className="mt-1.5 text-[13px] font-black leading-tight text-navy">
        {value?.trim() || '—'}
      </p>
    </div>
  );
}

/** 출석 도장 7칸. 채워진 칸 수 = 현재 사이클 도장 수. */
function StampStrip({ stamps }: { stamps: number }) {
  return (
    <div
      className="flex shrink-0 gap-1"
      aria-label={`출석 도장 ${stamps} / ${BREAD.stampsPerReward}`}
    >
      {Array.from({ length: BREAD.stampsPerReward }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < stamps ? 'bg-mint' : 'bg-navy/12'
          }`}
        />
      ))}
    </div>
  );
}
