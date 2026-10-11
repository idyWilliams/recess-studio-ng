import type { Metadata, Viewport } from 'next';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recess — Social Multiplayer Gaming',
  description: 'Play. Connect. Compete. Mobile-first social games.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAF9F5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-recess-cream text-recess-text-primary antialiased">
        <AppHeader />
        <div className="flex-1 pb-24 sm:pb-12">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
