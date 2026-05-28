'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, Cake, RotateCcw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'ggobuk_seasonal_dismissed_';

interface Props {
  /** ISO date string (YYYY-MM-DD) from saju_profiles.birth_date */
  birthDate: string;
  /** 가장 최근 풀이의 generated_at (ISO). 없으면 null. */
  latestInterpretationAt: string | null;
}

type Slot = {
  /** localStorage dismiss 키에 들어갈 식별자. 시즌마다 다른 키여야 한 번 dismiss해도 다음 시즌엔 다시 뜸. */
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  gradient: string;
  borderColor: string;
};

function ymdToParts(ymd: string): { month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  return { month: Number(m[2]), day: Number(m[3]) };
}

function daysUntilBirthday(birthDate: string, today: Date): number | null {
  const parts = ymdToParts(birthDate);
  if (!parts) return null;
  const year = today.getFullYear();
  let bday = new Date(year, parts.month - 1, parts.day);
  // 올해 생일 지났으면 내년 생일까지
  if (bday.getTime() < today.getTime() - 7 * 86400000) {
    bday = new Date(year + 1, parts.month - 1, parts.day);
  }
  const diffMs = bday.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

/**
 * 우선순위:
 *  1. 신년 (1/1-1/14)
 *  2. 생일 ±7일
 *  3. 최근 풀이가 180일 이상 (사주 다시 받아볼 시기)
 *  4. 없음 (배너 미노출)
 */
function pickSlot(props: Props, now: Date): Slot | null {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  // 1) 신년 (1/1-1/14)
  if (month === 1 && day <= 14) {
    return {
      id: `newyear-${year}`,
      icon: Sparkles,
      eyebrow: `🎊 ${year}년 새해`,
      title: `${year}년 사주를 다시 받아볼 시기`,
      body: '한 해 흐름이 바뀌었어요. 새 연주(年柱)와 올해 세운을 반영한 풀이를 받아보세요.',
      href: '/shell',
      cta: '새해 사주 받기',
      gradient: 'from-red/14 via-white to-gold/18',
      borderColor: 'border-red/40',
    };
  }

  // 2) 생일 ±7일
  const daysToBday = daysUntilBirthday(props.birthDate, now);
  if (daysToBday !== null && Math.abs(daysToBday) <= 7) {
    return {
      id: `birthday-${year}`,
      icon: Cake,
      eyebrow: daysToBday === 0 ? '🎂 생일 축하해요' : daysToBday > 0 ? `🎂 생일 ${daysToBday}일 전` : '🎂 생일 주간',
      title: '한 살 더 먹은 사주, 다시 풀어볼래?',
      body: '나이가 바뀌면 대운 진행도 바뀌어요. 올해 흐름을 새 페르소나로 받아보는 것도 좋아요.',
      href: '/shell',
      cta: '생일 운세 받기',
      gradient: 'from-gold/18 via-white to-red/10',
      borderColor: 'border-gold/45',
    };
  }

  // 3) 최근 풀이 180일 이상 — 또는 풀이 한 번도 없음(180일은 너무 길어서 14일 이상으로 단축)
  if (props.latestInterpretationAt) {
    const last = new Date(props.latestInterpretationAt);
    const days = (now.getTime() - last.getTime()) / 86400000;
    if (days >= 180) {
      return {
        id: `stale-${last.toISOString().slice(0, 7)}`, // 한 달 단위로 dismiss 키 다름
        icon: RotateCcw,
        eyebrow: '⏳ 풀이 받은 지 오래됐어요',
        title: `마지막 풀이가 ${Math.floor(days)}일 전`,
        body: '대운과 세운이 흘렀어요. 같은 카테고리도 시점 풀이가 달라져요.',
        href: '/shell',
        cta: '풀이 다시 받기',
        gradient: 'from-mint/14 via-white to-navy/8',
        borderColor: 'border-mint/40',
      };
    }
  }

  return null;
}

/**
 * 신년·생일·시점성 배너 — home 상단에 조건부 노출.
 * 시즌·생일이 지나면 자동으로 다른 슬롯으로 전환되거나 사라짐.
 * dismiss 클릭은 그 슬롯의 id로 localStorage에 저장돼서, 같은 시즌엔 다시 안 뜸.
 */
export function SeasonalUpdateBanner(props: Props) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const now = new Date();
    const picked = pickSlot(props, now);
    if (!picked) {
      setSlot(null);
      return;
    }
    setSlot(picked);
    const stored = window.localStorage.getItem(STORAGE_KEY_PREFIX + picked.id);
    setDismissed(stored === '1');
  }, [props]);

  if (!slot || dismissed) return null;

  function handleDismiss() {
    if (!slot) return;
    window.localStorage.setItem(STORAGE_KEY_PREFIX + slot.id, '1');
    setDismissed(true);
  }

  const Icon = slot.icon;
  return (
    <div
      className={`relative mt-4 overflow-hidden rounded-3xl border ${slot.borderColor} bg-gradient-to-br ${slot.gradient} p-4 shadow-[0_10px_24px_rgba(44,62,80,0.08)]`}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="닫기"
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-navy/60 active:scale-95"
      >
        <X size={14} strokeWidth={2.5} />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/90 text-navy shadow-sm">
          <Icon size={20} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold text-navy/70">{slot.eyebrow}</p>
          <p className="mt-0.5 text-[15px] font-black leading-snug text-navy">
            {slot.title}
          </p>
          <p className="mt-1 text-[11.5px] font-bold leading-relaxed text-navy/80">
            {slot.body}
          </p>
        </div>
      </div>

      <Link
        href={slot.href}
        className="mt-3 block w-full rounded-2xl bg-navy py-2.5 text-center text-[13px] font-black text-white active:scale-[0.99]"
      >
        {slot.cta} →
      </Link>
    </div>
  );
}
