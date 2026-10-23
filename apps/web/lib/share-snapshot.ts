'use client';

/**
 * Client-Side Canvas Board Snapshot Generator & Web Share API Level 2 Bridge.
 *
 * Renders a crisp 1200x630 match snapshot image directly in the browser via HTML5 Canvas
 * and shares it via navigator.share({ files: [file] }) with graceful fallback to wa.me.
 */

export interface SnapshotPlayerInfo {
  name: string;
  score: number;
  lives?: number | undefined;
  isWinner?: boolean | undefined;
  isCurrentTurn?: boolean | undefined;
}

export interface MatchSnapshotOptions {
  gameName: string; // e.g. 'Word Battle' | 'Mancala Royale' | 'Whot! Naija' | 'Ludo Arena'
  headline: string; // e.g. "Chidi's Turn!" | "Victory! Chidi Won!"
  statusBadge: string; // e.g. "Round 4 of 5" | "Checkmate" | "Turn Active"
  playerOne: SnapshotPlayerInfo;
  playerTwo: SnapshotPlayerInfo;
  lastWord?: string | null | undefined;
  lastScore?: number | null | undefined;
  miniTiles?: string[] | undefined;
}

export interface ShareMatchOptions {
  snapshotOptions: MatchSnapshotOptions;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
  fallbackUrl: string; // WhatsApp deep link
}

/**
 * Fallback-safe rounded rectangle drawing for CanvasRenderingContext2D.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates a high-resolution 1200x630 PNG snapshot of the match on an HTML5 canvas.
 * Returns a Blob or null if canvas is unavailable (SSR/headless environment).
 */
export async function generateMatchSnapshotBlob(
  options: MatchSnapshotOptions,
): Promise<Blob | null> {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Dark Obsidian Background
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  bgGrad.addColorStop(0, '#05070B');
  bgGrad.addColorStop(1, '#0B1120');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // 2. Ambient Radial Glows
  // Purple glow top-left
  const purpleGlow = ctx.createRadialGradient(200, 120, 10, 200, 120, 420);
  purpleGlow.addColorStop(0, 'rgba(108, 56, 255, 0.35)');
  purpleGlow.addColorStop(1, 'rgba(108, 56, 255, 0)');
  ctx.fillStyle = purpleGlow;
  ctx.fillRect(0, 0, 1200, 630);

  // Blue glow top-right
  const blueGlow = ctx.createRadialGradient(1000, 140, 10, 1000, 140, 380);
  blueGlow.addColorStop(0, 'rgba(27, 118, 255, 0.28)');
  blueGlow.addColorStop(1, 'rgba(27, 118, 255, 0)');
  ctx.fillStyle = blueGlow;
  ctx.fillRect(0, 0, 1200, 630);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 40; x < 1200; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 630);
    ctx.stroke();
  }
  for (let y = 40; y < 630; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // 3. Header Section (y = 50..110)
  // Brand Logo Box
  const logoGrad = ctx.createLinearGradient(70, 50, 118, 98);
  logoGrad.addColorStop(0, '#6C38FF');
  logoGrad.addColorStop(1, '#1B76FF');
  drawRoundedRect(ctx, 70, 50, 48, 48, 12);
  ctx.fillStyle = logoGrad;
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', 94, 74);

  // Brand Name & Game Title
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#A78BFA';
  ctx.fillText('RECESS STUDIO ARCADE', 132, 64);

  ctx.font = '900 20px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(options.gameName.toUpperCase(), 132, 88);

  // Status Badge Capsule (Top Right)
  ctx.textAlign = 'right';
  const badgeText = options.statusBadge.toUpperCase();
  drawRoundedRect(ctx, 880, 52, 250, 42, 21);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Green pulsing dot
  ctx.beginPath();
  ctx.arc(912, 73, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#10B981';
  ctx.fill();

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#6EE7B7';
  ctx.fillText(badgeText, 1105, 74);

  // 4. Headline (y = 155)
  ctx.textAlign = 'center';
  ctx.font = '900 36px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(options.headline, 600, 160);

  // 5. Player 1 & Player 2 Cards
  // Player 1 Card (Left: x = 70, y = 205, w = 450, h = 230)
  drawRoundedRect(ctx, 70, 205, 450, 230, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = options.playerOne.isCurrentTurn
    ? 'rgba(16, 185, 129, 0.6)'
    : 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // P1 Avatar Circle
  ctx.beginPath();
  ctx.arc(145, 280, 38, 0, Math.PI * 2);
  const p1AvatarGrad = ctx.createLinearGradient(107, 242, 183, 318);
  p1AvatarGrad.addColorStop(0, '#8B5CF6');
  p1AvatarGrad.addColorStop(1, '#3B82F6');
  ctx.fillStyle = p1AvatarGrad;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.playerOne.name.slice(0, 1).toUpperCase(), 145, 282);

  // P1 Name
  ctx.textAlign = 'left';
  ctx.font = '900 24px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(options.playerOne.name, 205, 268);

  // P1 Score
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText(`${options.playerOne.score} pts`, 205, 312);

  // P1 Lives / status
  if (options.playerOne.lives !== undefined) {
    const hearts = '❤️'.repeat(options.playerOne.lives) + '🖤'.repeat(Math.max(0, 3 - options.playerOne.lives));
    ctx.font = '18px sans-serif';
    ctx.fillText(hearts, 205, 345);
  }

  // P1 Turn indicator chip
  if (options.playerOne.isCurrentTurn) {
    drawRoundedRect(ctx, 95, 380, 130, 30, 15);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ACTIVE TURN', 160, 396);
  }

  // VS Emblem Center
  ctx.beginPath();
  ctx.arc(600, 320, 36, 0, Math.PI * 2);
  const vsGrad = ctx.createLinearGradient(564, 284, 636, 356);
  vsGrad.addColorStop(0, '#1E293B');
  vsGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = vsGrad;
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FEF3C7';
  ctx.font = '900 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VS', 600, 322);

  // Player 2 Card (Right: x = 680, y = 205, w = 450, h = 230)
  drawRoundedRect(ctx, 680, 205, 450, 230, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = options.playerTwo.isCurrentTurn
    ? 'rgba(16, 185, 129, 0.6)'
    : 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // P2 Avatar Circle
  ctx.beginPath();
  ctx.arc(755, 280, 38, 0, Math.PI * 2);
  const p2AvatarGrad = ctx.createLinearGradient(717, 242, 793, 318);
  p2AvatarGrad.addColorStop(0, '#EC4899');
  p2AvatarGrad.addColorStop(1, '#F59E0B');
  ctx.fillStyle = p2AvatarGrad;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.playerTwo.name.slice(0, 1).toUpperCase(), 755, 282);

  // P2 Name
  ctx.textAlign = 'left';
  ctx.font = '900 24px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(options.playerTwo.name, 815, 268);

  // P2 Score
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText(`${options.playerTwo.score} pts`, 815, 312);

  // P2 Lives
  if (options.playerTwo.lives !== undefined) {
    const hearts = '❤️'.repeat(options.playerTwo.lives) + '🖤'.repeat(Math.max(0, 3 - options.playerTwo.lives));
    ctx.font = '18px sans-serif';
    ctx.fillText(hearts, 815, 345);
  }

  // P2 Turn indicator chip
  if (options.playerTwo.isCurrentTurn) {
    drawRoundedRect(ctx, 705, 380, 130, 30, 15);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ACTIVE TURN', 770, 396);
  }

  // 6. Action / Move Highlight Banner (y = 465, h = 65)
  drawRoundedRect(ctx, 160, 465, 880, 65, 18);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#E2E8F0';

  if (options.lastWord) {
    const pts = typeof options.lastScore === 'number' ? ` (+${options.lastScore} pts)` : '';
    ctx.fillText(`⚔️ Last Played Word: "${options.lastWord.toUpperCase()}"${pts}`, 600, 502);
  } else {
    ctx.fillText('⚔️ 1v1 Real-Time Server-Authoritative Duel', 600, 502);
  }

  // 7. Footer
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Play directly in your browser on Recess • recess.studio', 600, 575);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Checks whether Web Share API Level 2 file sharing is supported in the current environment.
 */
export function isWebShareFileSupported(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return typeof navigator.canShare === 'function' && typeof navigator.share === 'function';
}

/**
 * Web Share API Level 2 Bridge:
 * Attempts native file sharing with generated canvas snapshot.
 * Gracefully falls back to wa.me deep link if unsupported or unavailable.
 */
export async function shareMatchSnapshotToWhatsApp(
  options: ShareMatchOptions,
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // Try generating the canvas PNG snapshot
  let fileToShare: File | null = null;
  try {
    const blob = await generateMatchSnapshotBlob(options.snapshotOptions);
    if (blob) {
      fileToShare = new File([blob], 'recess-match-preview.png', {
        type: 'image/png',
      });
    }
  } catch {
    // If canvas generation fails, fileToShare remains null
  }

  // Check if native navigator.share with files is supported
  if (
    fileToShare &&
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [fileToShare] })
  ) {
    try {
      await navigator.share({
        files: [fileToShare],
        title: options.shareTitle,
        text: options.shareText,
        url: options.shareUrl,
      });
      return true;
    } catch (err: unknown) {
      // User cancelled/aborted share sheet intentionally
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
      // On other errors, fall through to WhatsApp deep link fallback
    }
  }

  // Graceful Fallback: Open WhatsApp deep link with versioned OpenGraph URL
  window.open(options.fallbackUrl, '_blank', 'noopener,noreferrer');
  return true;
}
