import { ImageResponse } from 'next/og';

import type { WordBattleSession } from '@/lib/api-client';
import { MatchPreviewCard } from '@/lib/og-card';

export const runtime = 'nodejs';
export const alt = 'Word Battle Match Preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

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

export default async function Image({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  const session = publicId ? await fetchSession(publicId) : null;

  return new ImageResponse(
    <MatchPreviewCard publicId={publicId} session={session} />,
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Content-Type': 'image/png',
      },
    },
  );
}
