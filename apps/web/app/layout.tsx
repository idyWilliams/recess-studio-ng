import type { Metadata, Viewport } from 'next';
import { AppHeader } from '@/components/navigation/AppHeader';
import { BottomNav } from '@/components/navigation/BottomNav';
import { QueryProvider } from '@/components/providers/QueryProvider';
import './globals.css';

import { getDynamicSiteUrl } from '@/lib/server-url';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getDynamicSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: 'Recess — Social Multiplayer Gaming Arcade',
    description: 'Play. Connect. Compete. Mobile-first social games.',
    openGraph: {
      title: 'Recess — Social Multiplayer Gaming Arcade',
      description: 'Play. Connect. Compete. Mobile-first social games.',
      url: siteUrl,
      siteName: 'Recess Studio',
      type: 'website',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Recess Studio',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#05070B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh flex-col bg-[#05070B] text-white antialiased selection:bg-recess-purple selection:text-white">
        <QueryProvider>
          <AppHeader />
          <div className="flex-1 pb-24 sm:pb-12">{children}</div>
          <BottomNav />
        </QueryProvider>
      </body>
    </html>
  );
}
