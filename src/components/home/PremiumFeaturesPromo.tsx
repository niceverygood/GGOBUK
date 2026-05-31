'use client';

import Link from 'next/link';
import { Sparkles, ImageIcon, BookOpen } from 'lucide-react';
import { CREDIT_COSTS } from '@/lib/credits';

/**
 * 부적·웹툰 같은 high-margin 기능을 home에서 promotion.
 *
 * - 부적: 가입 후 1회 무료 (talismansLifetime: 1) — 신규 유저 강력 후킹
 * - 웹툰: 정밀 풀이 → 4컷 이미지 변환. 이미지 비용 ~₩100/장, 매출 ~₩2,456
 *   = 마진 95%+ 핵심 매출 기능
 *
 * 정밀 풀이 카드 아래에 노출되어 자연스럽게 이어가게.
 */
export function PremiumFeaturesPromo() {
  return (
    <section className="mt-10">
      <div className="mb-3">
        <p className="text-[13px] font-extrabold text-muted">사주를 작품으로 받기</p>
        <h2 className="mt-0.5 text-[22px] font-black leading-tight text-navy">
          꼬북점 프리미엄 풀이
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* 부적 — 첫 1장 무료 강조 */}
        <Link
          href="/shell"
          prefetch
          className="overflow-hidden rounded-3xl border border-gold/45 bg-gradient-to-br from-gold/18 via-white to-red/8 p-3 shadow-[0_8px_18px_rgba(244,208,63,0.12)] transition active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/85 text-[#B58A00]">
              <ImageIcon size={18} strokeWidth={2.5} />
            </span>
            <span className="rounded-full bg-red/15 px-1.5 py-0.5 text-[9px] font-black text-red">
              첫 1장 무료
            </span>
          </div>
          <p className="mt-2 text-[13.5px] font-black text-navy leading-snug">
            내 사주 부적
          </p>
          <p className="mt-0.5 text-[10.5px] font-bold leading-snug text-navy/75">
            AI가 내 오행에 맞춰
            <br />
            세상에 하나뿐인 부적
          </p>
          <p className="mt-2 text-[10px] font-extrabold text-[#B58A00]">
            이후 {CREDIT_COSTS.talisman}알/장
          </p>
        </Link>

        {/* 웹툰 — high-margin, 정밀 풀이를 시각화 */}
        <Link
          href="/shell"
          prefetch
          className="overflow-hidden rounded-3xl border border-mint/45 bg-gradient-to-br from-mint/16 via-white to-navy/8 p-3 shadow-[0_8px_18px_rgba(78,205,196,0.12)] transition active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/85 text-mint-dark">
              <BookOpen size={18} strokeWidth={2.5} />
            </span>
            <span className="rounded-full bg-mint/25 px-1.5 py-0.5 text-[9px] font-black text-mint-dark">
              NEW
            </span>
          </div>
          <p className="mt-2 text-[13.5px] font-black text-navy leading-snug">
            사주 4컷 웹툰
          </p>
          <p className="mt-0.5 text-[10.5px] font-bold leading-snug text-navy/75">
            내 풀이를
            <br />
            세로 4컷 만화로
          </p>
          <p className="mt-2 text-[10px] font-extrabold text-mint-dark">
            {CREDIT_COSTS.comic}알/장 · 정밀 풀이 후
          </p>
        </Link>
      </div>

      <p className="mt-2.5 flex items-center gap-1 text-[10.5px] font-bold text-muted">
        <Sparkles size={11} strokeWidth={2.5} className="text-[#B58A00]" />
        SNS 공유하기 좋아요 · 보관함에 영구 저장
      </p>
    </section>
  );
}
