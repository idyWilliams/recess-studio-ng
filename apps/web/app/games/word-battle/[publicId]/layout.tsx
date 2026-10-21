import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import type { WordBattleSession } from '@/lib/api-client';

async function fetchSession(publicId: string): Promise<WordBattleSession | null> {
  const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${apiTarget}/game-sessions/${publicId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as WordBattleSession;
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

  let title = 'Word Battle | Recess Studio';
  let description = 'Play Word Battle — 15-second casual word duel with friends directly in WhatsApp.';

  if (session) {
    const p1 = session.players[0]?.username ?? 'Player 1';
    const p2 = session.players[1]?.username;

    if (session.status === 'completed' && session.result) {
      const winner = session.players.find((p) => p.userId === session.result?.winnerId);
      title = `${p1} vs ${p2 ?? 'Player 2'} — Match Finished | Recess`;
      description = winner
        ? `${winner.username} won the match! Tap to view the recap and request a rematch.`
        : 'Tie game! Tap to view the recap and play again.';
    } else if (p2) {
      const p1Score = session.state?.scores?.[session.players[0]!.userId] ?? 0;
      const p2Score = session.state?.scores?.[session.players[1]!.userId] ?? 0;
      title = `${p1} vs ${p2} — Word Battle | Recess`;
      description = `Round in progress (${p1Score} - ${p2Score}). Tap to play your turn now!`;
    } else {
      title = `${p1} is waiting for an opponent — Word Battle | Recess`;
      description = `${p1} challenged you to a game of Word Battle! Tap to take the open seat.`;
    }
  }

  const ogImageUrl = `/games/word-battle/${publicId}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Word Battle Match Preview',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function WordBattleMatchLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
