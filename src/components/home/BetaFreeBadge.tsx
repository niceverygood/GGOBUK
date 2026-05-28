import { Gift } from 'lucide-react';

/**
 * 베타 기간 무료 모드 안내 칩. server component에서 환경변수 체크 후 노출.
 *
 * 활성화: BETA_FREE_MODE=true env var.
 * 출시 직전에 env 제거하면 자동으로 안 보임.
 */
export function BetaFreeBadge() {
  const active = process.env.BETA_FREE_MODE?.trim().toLowerCase() === 'true';
  if (!active) return null;

  return (
    <div className="mt-3 flex items-center gap-2 rounded-full border border-mint/40 bg-gradient-to-r from-mint/15 via-white to-gold/12 px-3 py-1.5 shadow-[0_4px_10px_rgba(78,205,196,0.10)]">
      <Gift size={13} strokeWidth={2.5} className="text-mint-dark shrink-0" />
      <p className="text-[11.5px] font-extrabold leading-none text-navy">
        🎁 베타 기간 — 모든 풀이 무료
      </p>
      <span className="ml-auto text-[9.5px] font-bold text-muted leading-none">
        꼬북알 차감 X
      </span>
    </div>
  );
}
