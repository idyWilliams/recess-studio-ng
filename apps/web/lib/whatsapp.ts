/**
 * WhatsApp viral sharing and deep linking utilities for Recess Studio.
 *
 * WhatsApp caches OpenGraph scraper previews aggressively by URL. By including
 * a monotonic version query parameter (`?v=${stateVersion}`), each completed turn
 * produces a distinct URL, causing WhatsApp's scraper to fetch the latest dynamic
 * match preview card without stale cache hits.
 */

export interface WhatsAppNudgeOptions {
  publicId: string;
  stateVersion: number;
  senderName: string;
  opponentName?: string | undefined;
  lastMoveWord?: string | null | undefined;
  lastMoveScore?: number | null | undefined;
  origin?: string | undefined;
}

export interface WhatsAppResultOptions {
  publicId: string;
  winnerName: string | null;
  viewerWon: boolean;
  isDraw: boolean;
  myScore: number;
  opponentScore: number;
  opponentName: string;
  origin?: string | undefined;
}

/**
 * Returns the versioned match URL with query parameter `?v=${stateVersion}`.
 */
export function getVersionedMatchUrl(
  publicId: string,
  stateVersion: number = 0,
  origin?: string,
): string {
  const base =
    origin ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://recess.gg');
  return `${base}/games/word-battle/${publicId}?v=${stateVersion}`;
}

/**
 * Formats a clean WhatsApp deep link (`https://wa.me/?text=...`) for a pre-match invite.
 */
export function formatWhatsAppInviteUrl(
  publicId: string,
  creatorName: string = 'A friend',
  origin?: string,
): string {
  const url = getVersionedMatchUrl(publicId, 0, origin);
  const message = `🎮 ${creatorName} challenged you to a game of Word Battle on Recess!\n\n15 seconds per turn • Play directly in your browser:\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Formats a clean WhatsApp deep link to nudge an opponent when it's their turn.
 */
export function formatWhatsAppNudgeUrl(
  options: WhatsAppNudgeOptions,
): string {
  const {
    publicId,
    stateVersion,
    senderName,
    lastMoveWord,
    lastMoveScore,
    origin,
  } = options;

  const url = getVersionedMatchUrl(publicId, stateVersion, origin);

  let message = `⚔️ Your turn in Word Battle against ${senderName}!`;
  if (lastMoveWord) {
    const pts = typeof lastMoveScore === 'number' ? ` (+${lastMoveScore} pts)` : '';
    message += `\n${senderName} played "${lastMoveWord}"${pts}`;
  }
  message += `\n\nPlay your turn now:\n${url}`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Formats a clean WhatsApp deep link to share match results / victory recap.
 */
export function formatWhatsAppResultUrl(
  options: WhatsAppResultOptions,
): string {
  const {
    publicId,
    winnerName,
    isDraw,
    myScore,
    opponentScore,
    opponentName,
    origin,
  } = options;

  const url = getVersionedMatchUrl(publicId, 999, origin);

  let headline = isDraw ? '🤝 Tie Game!' : `🏆 ${winnerName} won!`;
  const scoresText = `Final: ${myScore} pts vs ${opponentName} (${opponentScore} pts)`;
  const message = `${headline}\n${scoresText}\n\nCheck out the replay and rematch here:\n${url}`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
