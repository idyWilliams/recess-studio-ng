import {
  formatWhatsAppResultUrl,
  getVersionedMatchUrl,
  shareMatchSnapshotToWhatsApp,
  type MatchSnapshotOptions,
} from './whatsapp';

export interface MatchResultNotificationOptions {
  publicId: string;
  myName: string;
  myScore: number;
  myLives?: number | undefined;
  opponentName: string;
  opponentScore: number;
  opponentLives?: number | undefined;
  winnerName: string | null;
  viewerWon: boolean;
  isDraw: boolean;
  isKnockout?: boolean | undefined;
  rematchPublicId?: string | null | undefined;
  lastWord?: string | null | undefined;
  origin?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Builds the complete share payload and canvas snapshot descriptor for a completed match.
 */
export function buildMatchResultNotification(
  options: MatchResultNotificationOptions,
) {
  const {
    publicId,
    myName,
    myScore,
    myLives,
    opponentName,
    opponentScore,
    opponentLives,
    winnerName,
    viewerWon,
    isDraw,
    isKnockout,
    rematchPublicId,
    lastWord,
    origin,
    userAgent,
  } = options;

  const fallbackUrl = formatWhatsAppResultUrl({
    publicId,
    winnerName,
    viewerWon,
    isDraw,
    isKnockout,
    myScore,
    opponentScore,
    opponentName,
    rematchPublicId,
    origin,
    userAgent,
  });

  const versionedUrl = getVersionedMatchUrl(publicId, 999, origin);

  const headline = isDraw
    ? '🤝 Tie Game!'
    : viewerWon
    ? `🏆 ${myName} Won!`
    : `🏆 ${winnerName ?? opponentName} Won!`;

  const statusBadge = isKnockout ? 'KNOCKOUT VICTORY' : 'FINAL RESULT';

  const snapshotOptions: MatchSnapshotOptions = {
    gameName: 'Word Battle',
    headline,
    statusBadge,
    playerOne: {
      name: myName,
      score: myScore,
      lives: myLives,
      isWinner: viewerWon,
    },
    playerTwo: {
      name: opponentName,
      score: opponentScore,
      lives: opponentLives,
      isWinner: !viewerWon && !isDraw,
    },
    lastWord: lastWord ?? undefined,
  };

  const shareTitle = 'Recess Studio — Word Battle Result';
  let shareText = `${headline}\nFinal Score: ${myScore} pts vs ${opponentName} (${opponentScore} pts)`;
  if (rematchPublicId) {
    const rematchUrl = getVersionedMatchUrl(rematchPublicId, 0, origin);
    shareText += `\n\n⚔️ 1-Tap Rematch:\n${rematchUrl}`;
  } else {
    shareText += `\n\nView match recap & play again:\n${versionedUrl}`;
  }

  return {
    headline,
    statusBadge,
    versionedUrl,
    fallbackUrl,
    snapshotOptions,
    shareTitle,
    shareText,
  };
}

/**
 * Executes the Web Share API Level 2 bridge or switches back to the WhatsApp chat
 * using the native `whatsapp://send?text=` URI scheme (or `https://wa.me/` on desktop).
 */
export async function sendMatchResultToWhatsApp(
  options: MatchResultNotificationOptions,
): Promise<boolean> {
  const {
    snapshotOptions,
    shareTitle,
    shareText,
    versionedUrl,
    fallbackUrl,
  } = buildMatchResultNotification(options);

  return shareMatchSnapshotToWhatsApp({
    snapshotOptions,
    shareTitle,
    shareText,
    shareUrl: versionedUrl,
    fallbackUrl,
  });
}
