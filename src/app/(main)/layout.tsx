import { BottomNav } from '@/components/nav/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-md mx-auto text-ink">
      {children}
      <BottomNav />
    </div>
  );
}
