import type { Metadata } from 'next';
import { BottomNav } from '@/components/nav/BottomNav';
import { PersonaModeChip } from '@/components/nav/PersonaModeChip';
import { AiConsentGate } from '@/components/privacy/AiConsentGate';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full max-w-md mx-auto overflow-x-hidden text-ink relative">
      <PersonaModeChip />
      {children}
      <BottomNav />
      <AiConsentGate />
    </div>
  );
}
