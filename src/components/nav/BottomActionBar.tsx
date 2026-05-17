import { cn } from '@/lib/utils/cn';

export function BottomActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-20 px-5 pt-4 pb-3 bg-gradient-to-t from-ivory via-ivory/95 to-transparent bottom-[calc(5.75rem+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}
