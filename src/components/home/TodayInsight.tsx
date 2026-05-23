import {
  ArrowDownRight,
  ArrowUpRight,
  Compass,
  Flame,
  Hash,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import {
  KkobukSprite,
  moodToSprite,
  type SpriteKey,
} from '@/components/kkobuk/KkobukSprite';
import { sipsungOf } from '@/lib/saju/sipsung';
import {
  CHEONGAN_OHAENG_IDX,
  CHEONGAN_YINYANG,
  JIJI_OHAENG_IDX,
  OHAENG,
} from '@/lib/saju/constants';
import { dayFortune } from '@/lib/saju/fortune_calendar';
import { iljuProfileOf } from '@/lib/saju/ilju_profile';
import { buildSajuResult } from '@/lib/saju';
import type { Palja, Pillar, SajuInput, Sipsung } from '@/lib/saju/types';

interface Props {
  /** 오늘의 일진 (서버에서 한 번 계산 후 prop으로 내려옴) */
  ilji: Pillar;
  /** 사용자 일주 */
  myDay: Palja['day'];
  /** 사용자 사주 input (today 점수 계산용) */
  sajuInput: SajuInput;
  /** AI 생성된 daily fortune (있으면 mood 동기화) */
  daily: {
    mood: string | null;
    one_liner?: string | null;
    lucky_color?: string | null;
    lucky_number?: number | null;
    lucky_direction?: string | null;
  } | null;
}

const SIPSUNG_VIBE: Record<
  Sipsung,
  { title: string; body: string; tone: 'good' | 'neutral' | 'caution' }
> = {
  비견: {
    title: '동료·자기 자리의 날',
    body: '나와 같은 결의 사람이 잘 모이고, 자기 기준을 다시 세우기 좋은 흐름.',
    tone: 'neutral',
  },
  겁재: {
    title: '경쟁·지출 신호',
    body: '같이 가는 듯하지만 결국 한쪽이 빼앗기는 흐름. 큰 결정·지출 미루기.',
    tone: 'caution',
  },
  식신: {
    title: '표현·생산의 날',
    body: '꾸준히 만들어내는 흐름이 잘 풀려. 결과로 보여주기 좋은 하루.',
    tone: 'good',
  },
  상관: {
    title: '창의·자유의 날',
    body: '아이디어가 잘 떠오르고 말이 잘 풀려. 단, 말의 날카로움은 조심.',
    tone: 'good',
  },
  편재: {
    title: '활동적 재물의 날',
    body: '돈·기회가 활발히 움직여. 단, 충동 지출은 평소보다 빠르다.',
    tone: 'neutral',
  },
  정재: {
    title: '안정적 재물의 날',
    body: '꾸준한 노력이 결과로 잡히기 좋은 흐름. 계약·저축에 좋다.',
    tone: 'good',
  },
  편관: {
    title: '책임·압박의 날',
    body: '"내가 안 하면" 싶은 일이 들어와. 한 호흡 두고 받기.',
    tone: 'caution',
  },
  정관: {
    title: '명분·규범의 날',
    body: '책임 자리가 정돈되는 흐름. 공식적인 결정·관계에 좋다.',
    tone: 'good',
  },
  편인: {
    title: '직관·공부의 날',
    body: '평소에 안 보이던 결이 보이는 흐름. 책·기록·정리에 좋다.',
    tone: 'good',
  },
  정인: {
    title: '보호·배움의 날',
    body: '도움·자격·귀인이 들어오는 흐름. 받는 걸 어색해 말기.',
    tone: 'good',
  },
};

const TONE_STYLE: Record<
  'good' | 'neutral' | 'caution',
  { chip: string; dot: string; label: string }
> = {
  good: {
    chip: 'bg-mint/20 text-[#16706B]',
    dot: 'bg-mint',
    label: '길',
  },
  neutral: {
    chip: 'bg-gold/30 text-[#5A4A20]',
    dot: 'bg-gold',
    label: '평',
  },
  caution: {
    chip: 'bg-red/15 text-red',
    dot: 'bg-red',
    label: '주의',
  },
};

const POSE_BY_TONE: Record<'good' | 'neutral' | 'caution', SpriteKey> = {
  good: 'pose-sing',
  neutral: 'pose-drink',
  caution: 'pose-meditate',
};

// 한국어 천간/지지 → 한자 도우미 (UI 칩용).
const HANJA_OF_GAN: Record<string, string> = {
  갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊',
  기: '己', 경: '庚', 신: '辛', 임: '壬', 계: '癸',
};
const HANJA_OF_JI: Record<string, string> = {
  자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳',
  오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥',
};

export function TodayInsight({ ilji, myDay, sajuInput, daily }: Props) {
  const saju = buildSajuResult(sajuInput);
  const today = `${new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)}`;
  const fortune = dayFortune(saju, today);

  // 일진×일간 십성
  const ilganIdx = myDay.ganIdx;
  const iljiSipsung = sipsungOf(
    CHEONGAN_OHAENG_IDX[ilganIdx],
    CHEONGAN_YINYANG[ilganIdx],
    CHEONGAN_OHAENG_IDX[ilji.ganIdx],
    CHEONGAN_YINYANG[ilji.ganIdx],
  );
  const vibe = SIPSUNG_VIBE[iljiSipsung];
  const tone = TONE_STYLE[vibe.tone];

  // 일진 지지 오행
  const iljiOhaeng = OHAENG[JIJI_OHAENG_IDX[ilji.jiIdx]];

  // 일주 60갑자 명조 (사용자의 일주)
  const ilju = iljuProfileOf(myDay.ganIdx, myDay.jiIdx);

  // 길운 점수 (실제 계산값) — 0-95
  const score = fortune.score;
  const sprite = daily?.mood
    ? moodToSprite(daily.mood)
    : POSE_BY_TONE[vibe.tone];

  return (
    <>
      {/* HERO — 다중 시각 요소 */}
      <Card className="mt-5 overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-mint/25 via-white to-gold/15 p-5">
          {/* score chip — 우상단 */}
          <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${tone.chip}`}
            >
              {tone.label} · {score}점
            </span>
            <span className="text-[10px] font-bold text-muted">
              일진×내 일간
            </span>
          </div>

          <div className="flex justify-center">
            <KkobukSprite
              variant={sprite}
              size="lg"
              ariaLabel={`꼬북이 ${vibe.tone}`}
            />
          </div>

          <p className="mt-2 text-center text-xs font-extrabold text-muted">
            오늘의 꼬북이
          </p>
          <h2 className="mt-1 text-center text-xl font-black text-navy">
            {vibe.title}
          </h2>
          <p className="mx-auto mt-2 max-w-[300px] text-center text-xs font-bold leading-relaxed text-muted">
            {vibe.body}
          </p>

          {/* 일진 상세 가로 정보 */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/80 p-2.5 text-center">
              <p className="text-[10px] font-extrabold text-muted">일진</p>
              <p className="mt-0.5 text-sm font-black text-navy">
                <span className="font-hanja">
                  {HANJA_OF_GAN[ilji.gan]}
                  {HANJA_OF_JI[ilji.ji]}
                </span>
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-muted">
                {ilji.gan}
                {ilji.ji}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-2.5 text-center">
              <p className="text-[10px] font-extrabold text-muted">관계</p>
              <p className="mt-0.5 text-sm font-black text-navy">
                {iljiSipsung}
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-muted">
                내 일간 {myDay.gan}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-2.5 text-center">
              <p className="text-[10px] font-extrabold text-muted">지지 오행</p>
              <p className="mt-0.5 text-sm font-black text-navy">{iljiOhaeng}</p>
              <p className="mt-0.5 text-[10px] font-bold text-muted">
                {fortune.hap ? '일지 합' : fortune.chung ? '일지 충' : '평행'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 오늘 들어오는 기운 + 행운 정보 — daily 있을 때만 */}
      {daily?.lucky_color && (
        <Card className="mt-3 p-4">
          <p className="text-xs font-extrabold text-muted">오늘의 행운 코드</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-mint/10 p-3 text-center">
              <Sparkles
                size={16}
                strokeWidth={2.4}
                className="mx-auto text-mint-dark"
              />
              <p className="mt-1 text-[10px] font-extrabold text-muted">컬러</p>
              <p className="mt-0.5 text-sm font-black text-navy">
                {daily.lucky_color ?? '-'}
              </p>
            </div>
            <div className="rounded-2xl bg-gold/15 p-3 text-center">
              <Hash
                size={16}
                strokeWidth={2.4}
                className="mx-auto text-[#7C5A0E]"
              />
              <p className="mt-1 text-[10px] font-extrabold text-muted">숫자</p>
              <p className="mt-0.5 text-sm font-black text-navy">
                {daily.lucky_number ?? '-'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#DCEBFF] p-3 text-center">
              <Compass
                size={16}
                strokeWidth={2.4}
                className="mx-auto text-[#1C3C5B]"
              />
              <p className="mt-1 text-[10px] font-extrabold text-muted">방향</p>
              <p className="mt-0.5 text-sm font-black text-navy">
                {daily.lucky_direction ?? '-'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 일주 60갑자 미니 카드 — 항상 표시 */}
      {ilju && (
        <Card className="mt-3 p-4 bg-gradient-to-br from-mint/12 via-white to-gold/10">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-mint-dark">
                내 일주 명조
              </p>
              <p className="mt-0.5 text-sm font-black text-navy">
                {ilju.name} 일주{' '}
                <span className="font-hanja text-muted">{ilju.hanja}</span>
              </p>
            </div>
            <span className="rounded-full bg-white/85 px-2 py-1 text-[10px] font-black text-navy">
              60갑자 {ilju.index + 1}번째
            </span>
          </div>
          <p className="mt-2 text-xs font-bold leading-relaxed text-navy">
            {ilju.ego}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ilju.keywords.slice(0, 5).map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-black text-navy border border-navy/8"
              >
                #{kw}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* 일진 풀이 한 줄 카드 */}
      <Card className="mt-3 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-navy text-white">
            <Flame size={18} strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold text-muted">
              오늘 들어오는 기운
            </p>
            <p className="mt-0.5 text-sm font-black text-navy">
              {iljiSipsung} · {iljiOhaeng} 기운 · {fortune.note}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-muted">
              {fortune.hap
                ? '일지와 육합이 이뤄져 사람·기회와의 연결이 부드러운 날.'
                : fortune.chung
                  ? '일지와 충이 들어와 변동·이동·의견 차이가 도드라지는 날.'
                  : '평행한 흐름이라 큰 변동은 없는 안정적인 날.'}
            </p>
          </div>
          <div className="text-right">
            {vibe.tone === 'good' && (
              <ArrowUpRight
                size={20}
                strokeWidth={2.6}
                className="text-mint-dark"
              />
            )}
            {vibe.tone === 'caution' && (
              <ArrowDownRight
                size={20}
                strokeWidth={2.6}
                className="text-red"
              />
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
