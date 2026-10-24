import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import type { WordBattleSession } from '@/lib/api-client';
import { MatchPreviewCard } from '@/lib/og-card';

export const runtime = 'nodejs';

async function fetchSession(publicId: string): Promise<WordBattleSession | null> {
  const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${apiTarget}/game-sessions/${publicId}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as WordBattleSession;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await context.params;

  try {
    const session = publicId ? await fetchSession(publicId) : null;

    return new ImageResponse(
      <MatchPreviewCard publicId={publicId} session={session} />,
      {
        width: 1200,
        height: 630,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch {
    return new ImageResponse(
      <MatchPreviewCard publicId={publicId} session={null} />,
      {
        width: 1200,
        height: 630,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}
