import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Badge, Card } from '@/components/ui/primitives';
import { iljuProfileOf } from '@/lib/saju/ilju_profile';
import type { Palja } from '@/lib/saju/types';

interface Props {
  /** 사용자 이름/닉네임 */
  name: string;
  /** 본인 일주 (= 일주 = 태어난 날의 기둥, 평생 불변) */
  day: Palja['day'];
  /** 생년월일 (YYYY-MM-DD) */
  birthDate: string;
  /** 태어난 시간 (HH:MM:SS | null) */
  birthTime: string | null;
  isLunar: boolean;
  gender: 'M' | 'F';
}

/**
 * 메인 최상단 "내 일주" 히어로.
 *
 * 기존 메인은 맨 위 큰 글씨가 '오늘 일진'(매일 바뀜)이라 사용자가 자기 사주로
 * 오해했다. 이 카드는 본인 일주(palja.day)를 화면 맨 위에 크게 고정 노출하고,
 * '일주 = 평생 변하지 않는 나' / '아래는 매일 바뀌는 오늘 일진'임을 명시해 혼동을
 * 없앤다. 60갑자 일주별 정체성·키워드는 ilju_profile.ts 에서 가져온다.
 */
export function MyIljuHero({
  name,
  day,
  birthDate,
  birthTime,
  isLunar,
  gender,
}: Props) {
  const ilju = iljuProfileOf(day.ganIdx, day.jiIdx);
  const calendar = isLunar ? '음력' : '양력';
  const time = birthTime ? birthTime.slice(0, 5) : '시간 모름';

  return (
    <Card className="mt-1 overflow-hidden p-0">
      <div className="bg-gradient-to-br from-mint/25 via-white to-gold/15 p-5">
        {/* 라벨 + 내 정보 수정 */}
        <div className="flex items-center justify-between gap-2">
          <Badge tone="mint">나 · 내 일주</Badge>
          <Link
            href="/more/people?edit=self"
            className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-black text-navy"
          >
            <Pencil size={12} strokeWidth={3} />내 정보
          </Link>
        </div>

        {/* 큰 간지 + 일주명 */}
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-navy text-white shadow-[0_10px_18px_rgba(44,62,80,0.22)]">
            <span className="font-hanja text-[26px] font-black leading-none">
              {day.ganHanja}
              {day.jiHanja}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-navy">
              {ilju ? ilju.name : `${day.gan}${day.ji}`} 일주
            </p>
            <p className="mt-0.5 text-xs font-bold text-muted">
              {name} · 일간 {day.gan}({day.ganOhaeng})
              {ilju ? ` · 60갑자 ${ilju.index + 1}번째` : ''}
            </p>
          </div>
        </div>

        {/* 한 줄 정체성 */}
        {ilju && (
          <p className="mt-3 text-sm font-bold leading-relaxed text-navy">
            {ilju.ego}
          </p>
        )}

        {/* 키워드 칩 */}
        {ilju && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ilju.keywords.slice(0, 5).map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-navy/8 bg-white/85 px-2.5 py-1 text-[10px] font-black text-navy"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

        {/* 일간·일지 한 줄 풀이 — 내 일주의 핵심 결(나 자신 / 배우자궁) */}
        {ilju && (
          <div className="mt-3 grid gap-1.5">
            <div className="rounded-2xl bg-white/70 px-3.5 py-2.5">
              <p className="text-[10px] font-black text-mint-dark">
                일간 · {day.gan}({day.ganOhaeng}) — 나 자신
              </p>
              <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-navy/80">
                {ilju.ganNote}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 px-3.5 py-2.5">
              <p className="text-[10px] font-black text-[#7C5A0E]">
                일지 · {day.ji} — 배우자궁
              </p>
              <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-navy/80">
                {ilju.jiNote}
              </p>
            </div>
          </div>
        )}

        {/* 생년월일 + 일주 vs 일진 혼동 방지 안내 */}
        <div className="mt-4 rounded-2xl bg-white/70 px-3.5 py-3">
          <p className="text-[11px] font-bold text-muted">
            {birthDate} · {time} · {calendar} ·{' '}
            {gender === 'M' ? '남성' : '여성'}
          </p>
          <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-muted">
            <span className="font-black text-mint-dark">ⓘ 일주</span>는 태어난
            날의 기둥 — 평생 변하지 않는 &lsquo;나&rsquo;예요. 매일 바뀌는 건 아래{' '}
            <span className="font-black text-navy">오늘 일진</span>이고요.
          </p>
        </div>
      </div>
    </Card>
  );
}
