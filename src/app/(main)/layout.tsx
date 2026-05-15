import { BottomNav } from '@/components/nav/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-md mx-auto pb-20 bg-[var(--color-paper)] text-[var(--color-ink)]">
      {children}
      <BottomNav />
    </div>
  );
}
