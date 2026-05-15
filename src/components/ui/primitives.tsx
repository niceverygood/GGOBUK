import { cn } from '@/lib/utils/cn';

export function Badge({ children, tone = 'mint', className }: { children: React.ReactNode; tone?: 'mint' | 'gold' | 'navy' | 'red'; className?: string }) {
  const toneCls =
    tone === 'mint'
      ? 'bg-mint/15 text-navy'
      : tone === 'gold'
        ? 'bg-gold/40 text-[#3F3420]'
        : tone === 'red'
          ? 'bg-red/15 text-red'
          : 'bg-navy text-white';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-extrabold', toneCls, className)}>
      {children}
    </span>
  );
}

export function Card({ children, className, soft }: { children: React.ReactNode; className?: string; soft?: boolean }) {
  return (
    <div
      className={cn(
        soft
          ? 'rounded-2xl border bg-white/60 border-navy/10'
          : 'rounded-3xl border bg-soft/90 border-navy/10 shadow-[0_12px_30px_rgba(44,62,80,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-mint/15 p-1 rounded-2xl gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 text-center py-2 rounded-xl text-xs font-extrabold transition',
            opt.value === value ? 'bg-white text-navy shadow' : 'text-[#6E786F]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SpeechBubble({ children, side = 'left' }: { children: React.ReactNode; side?: 'left' | 'right' }) {
  return (
    <div className={cn(
      'relative bg-white border border-navy/10 rounded-2xl px-4 py-3 text-sm leading-snug font-semibold text-navy shadow-[0_8px_20px_rgba(44,62,80,0.08)]',
    )}>
      {children}
      <span
        className={cn(
          'absolute bottom-[-7px] w-3.5 h-3.5 bg-white border-r border-b border-navy/10 rotate-45',
          side === 'left' ? 'left-5' : 'right-5',
        )}
      />
    </div>
  );
}

export function FortuneChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-3 rounded-2xl bg-white border border-navy/10">
      <div className="text-lg font-extrabold leading-none">{icon}</div>
      <span className="text-[11px] text-[#8B8174] font-extrabold">{label}</span>
      <strong className="text-sm text-navy font-bold">{value}</strong>
    </div>
  );
}

export function SectionTitle({ children, suffix }: { children: React.ReactNode; suffix?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-navy">{children}</h2>
      </div>
      {suffix}
    </div>
  );
}

export function HanjiBackdrop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="hanji-overlay" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function ButtonPrimary({
  children,
  onClick,
  disabled,
  tone = 'navy',
  className,
  type,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'navy' | 'mint' | 'gold';
  className?: string;
  type?: 'button' | 'submit';
}) {
  const toneCls =
    tone === 'mint' ? 'bg-mint text-[#163438]' : tone === 'gold' ? 'bg-gold text-[#3F3420]' : 'bg-navy text-white';
  return (
    <button
      type={type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full h-14 rounded-2xl font-black text-base shadow-[0_14px_26px_rgba(44,62,80,0.22)] transition disabled:opacity-60 disabled:shadow-none',
        toneCls,
        className,
      )}
    >
      {children}
    </button>
  );
}
