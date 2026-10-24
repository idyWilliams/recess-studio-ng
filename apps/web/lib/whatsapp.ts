/**
 * WhatsApp viral sharing and deep linking utilities for Recess Studio.
 *
 * WhatsApp caches OpenGraph scraper previews aggressively by URL. By including
 * a monotonic version query parameter (`?v=${stateVersion}`), each completed turn
 * produces a distinct URL, causing WhatsApp's scraper to fetch the latest dynamic
 * match preview card without stale cache hits.
 */

export {
  generateMatchSnapshotBlob,
  isWebShareFileSupported,
  shareMatchSnapshotToWhatsApp,
  type MatchSnapshotOptions,
  type ShareMatchOptions,
  type SnapshotPlayerInfo,
} from './share-snapshot';

export interface WhatsAppNudgeOptions {
  publicId: string;
  stateVersion: number;
  senderName: string;
  opponentName?: string | undefined;
  lastMoveWord?: string | null | undefined;
  lastMoveScore?: number | null | undefined;
  origin?: string | undefined;
  userAgent?: string | undefined;
}

export interface WhatsAppResultOptions {
  publicId: string;
  winnerName: string | null;
  viewerWon: boolean;
  isDraw: boolean;
  myScore: number;
  opponentScore: number;
  opponentName: string;
  isKnockout?: boolean | undefined;
  rematchPublicId?: string | null | undefined;
  origin?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Detects whether the current environment or provided user-agent is a mobile client.
 */
export function isMobileDevice(userAgent?: string): boolean {
  if (typeof userAgent === 'string') {
    return /iPhone|iPad|iPod|Android/i.test(userAgent);
  }
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }
  return false;
}

/**
 * Emits a native `whatsapp://send?text=` URI scheme on mobile to jump directly
 * into the WhatsApp app, and falls back to universal `https://wa.me/?text=` on desktop.
 */
export function formatWhatsAppDeepLink(
  message: string,
  userAgent?: string,
): string {
  const encoded = encodeURIComponent(message);
  if (isMobileDevice(userAgent)) {
    return `whatsapp://send?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
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
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio');
  return `${base}/games/word-battle/${publicId}?v=${stateVersion}`;
}

/**
 * Formats a clean WhatsApp deep link for a pre-match invite.
 * Raw URLs are emitted on their own line without markdown syntax.
 */
export function formatWhatsAppInviteUrl(
  publicId: string,
  creatorName: string = 'A friend',
  origin?: string,
  userAgent?: string,
): string {
  const url = getVersionedMatchUrl(publicId, 0, origin);
  const message = `🎮 ${creatorName} challenged you to a game of Word Battle on Recess!\n\n15 seconds per turn • Play directly in your browser:\n${url}`;
  return formatWhatsAppDeepLink(message, userAgent);
}

/**
 * Formats a clean WhatsApp deep link to nudge an opponent when it's their turn.
 * Raw URLs are emitted on their own line without markdown syntax.
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
    userAgent,
  } = options;

  const url = getVersionedMatchUrl(publicId, stateVersion, origin);

  let message = `⚔️ Your turn in Word Battle against ${senderName}!`;
  if (lastMoveWord) {
    const pts = typeof lastMoveScore === 'number' ? ` (+${lastMoveScore} pts)` : '';
    message += `\n${senderName} played "${lastMoveWord}"${pts}`;
  }
  message += `\n\nPlay your turn now:\n${url}`;

  return formatWhatsAppDeepLink(message, userAgent);
}

/**
 * Formats a clean WhatsApp deep link to share match results / victory recap.
 * Raw URLs are emitted on their own line without markdown syntax.
 */
export function formatWhatsAppResultUrl(
  options: WhatsAppResultOptions,
): string {
  const {
    publicId,
    winnerName,
    isDraw,
    viewerWon,
    isKnockout,
    myScore,
    opponentScore,
    opponentName,
    rematchPublicId,
    origin,
    userAgent,
  } = options;

  const url = getVersionedMatchUrl(publicId, 999, origin);

  let headline = isDraw
    ? '🤝 Tie Game!'
    : viewerWon
    ? `🏆 I won Word Battle${isKnockout ? ' by knockout' : ''}!`
    : `🏆 ${winnerName ?? 'Opponent'} won Word Battle!`;

  const scoresText = `Final: ${myScore} pts vs ${opponentName} (${opponentScore} pts)`;
  let message = `${headline}\n${scoresText}\n\n`;

  if (rematchPublicId) {
    const rematchUrl = getVersionedMatchUrl(rematchPublicId, 0, origin);
    message += `⚔️ Rematch is ready — tap to join:\n${rematchUrl}`;
  } else {
    message += `Check out the replay and rematch here:\n${url}`;
  }

  return formatWhatsAppDeepLink(message, userAgent);
}
