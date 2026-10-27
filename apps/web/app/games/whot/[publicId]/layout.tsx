import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import type { GameSessionResponse } from '@recess/shared';
import { getDynamicSiteUrl } from '@/lib/server-url';

async function fetchSession(publicId: string): Promise<GameSessionResponse<any, any> | null> {
  const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${apiTarget}/game-sessions/${publicId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as GameSessionResponse<any, any>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;

  const session = publicId ? await fetchSession(publicId) : null;

  let title = 'Whot! Naija Classic | Recess Studio';
  let description = 'Play Whot! Naija Classic — authentic Nigerian street card duel with configurable house rules.';

  if (session) {
    const p1 = session.players[0]?.username ?? 'Player 1';
    const p2 = session.players[1]?.username;

    if (session.status === 'completed' && session.result) {
      const winner = session.players.find((p) => p.userId === session.result?.winnerId);
      title = `${p1} vs ${p2 ?? 'Player 2'} — Match Finished | Whot! Recess`;
      description = winner
        ? `🏆 ${winner.username} checked up and won the match! Tap to view the recap and request a rematch.`
        : 'Game over! Tap to view the recap and play again.';
    } else if (p2) {
      title = `${p1} vs ${p2} — Whot! Naija Classic | Recess`;
      description = `Match in progress. Tap to play your card or draw from the Market!`;
    } else {
      title = `${p1} challenged you to Whot! Naija Classic | Recess`;
      description = `${p1} is waiting at the table! Tap to join and play directly in browser.`;
    }
  }

  const siteUrl = await getDynamicSiteUrl();
  const stateVersion = session?.stateVersion ?? 0;
  const ogImageUrl = `${siteUrl}/api/og/match/${publicId}?v=${stateVersion}`;
  const secureOgImageUrl = ogImageUrl.startsWith('http://')
    ? ogImageUrl.replace('http://', 'https://')
    : ogImageUrl;
  const absolutePageUrl = `${siteUrl}/games/whot/${publicId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absolutePageUrl,
      siteName: 'Recess Studio',
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: secureOgImageUrl,
          width: 1200,
          height: 630,
          alt: `${title} preview card`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [secureOgImageUrl],
    },
  };
}

export default function WhotMatchLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
