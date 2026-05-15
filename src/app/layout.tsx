import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '꼬북점 — 등껍질이 풀어주는 사주',
  description: '꼬북이 도사가 친근하게 풀어주는 사주. 등껍질을 탭하면 운명이 보입니다.',
  applicationName: '꼬북점',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '꼬북점' },
};

export const viewport: Viewport = {
  themeColor: '#4ECDC4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
