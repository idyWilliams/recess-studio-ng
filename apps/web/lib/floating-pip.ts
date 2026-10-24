/**
 * Cross-OS Floating Picture-in-Picture Engine for Recess Studio.
 *
 * Allows players to float a real-time, canvas-rendered mini-HUD on top of WhatsApp
 * or other apps across Android, iOS Safari, and desktop browsers.
 */

export interface LivePiPStateSnapshot {
  gameTitle: string;
  player1Name: string;
  player1Score: number;
  player2Name: string;
  player2Score: number;
  isMyTurn: boolean;
  turnLabel?: string | undefined;
  timeLeftSec?: number | null | undefined;
  lastWord?: string | null | undefined;
}

export interface FloatingPiPSupport {
  isSupported: boolean;
  mode: 'document' | 'video' | 'none';
}

export interface FloatingPiPController {
  isActive: () => boolean;
  updateState: (newState: LivePiPStateSnapshot) => void;
  stop: () => Promise<void>;
}

/**
 * Checks whether the browser supports Picture-in-Picture.
 */
export function getFloatingPiPSupport(): FloatingPiPSupport {
  if (typeof window === 'undefined') {
    return { isSupported: false, mode: 'none' };
  }

  if ('documentPictureInPicture' in window) {
    return { isSupported: true, mode: 'document' };
  }

  const hasVideoPiP =
    typeof HTMLVideoElement !== 'undefined' &&
    (typeof HTMLVideoElement.prototype.requestPictureInPicture === 'function' ||
      typeof (HTMLVideoElement.prototype as unknown as { webkitSetPresentationMode?: unknown })
        .webkitSetPresentationMode === 'function');

  if (hasVideoPiP) {
    return { isSupported: true, mode: 'video' };
  }

  return { isSupported: false, mode: 'none' };
}

/**
 * Draws the 480x270 dark obsidian & WhatsApp-emerald mini-HUD onto the canvas.
 */
export function renderPiPHUD(
  ctx: CanvasRenderingContext2D,
  state: LivePiPStateSnapshot,
  width = 480,
  height = 270,
): void {
  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0A0E1A');
  bgGrad.addColorStop(0.5, '#111827');
  bgGrad.addColorStop(1, '#05070B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle radial glow
  const glowGrad = ctx.createRadialGradient(
    width / 2,
    0,
    10,
    width / 2,
    0,
    width * 0.7,
  );
  glowGrad.addColorStop(
    0,
    state.isMyTurn ? 'rgba(0, 168, 132, 0.35)' : 'rgba(108, 56, 255, 0.25)',
  );
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Top Bar (Recess & Game Title)
  ctx.fillStyle = '#00A884';
  ctx.beginPath();
  ctx.arc(24, 26, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RECESS STUDIO', 36, 29);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`• ${state.gameTitle.toUpperCase()}`, 130, 29);

  // Live badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, width - 85, 14, 65, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('● LIVE PIP', width - 52, 29);

  // 3. Matchup Cards (Scores)
  const cardY = 50;
  const cardH = 95;
  const cardW = 190;

  // Player 1 Card (Left)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, 20, cardY, cardW, cardH, 12);
  ctx.fill();
  ctx.strokeStyle = state.isMyTurn
    ? 'rgba(0, 168, 132, 0.8)'
    : 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#E5E7EB';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(truncateText(state.player1Name, 12), 35, cardY + 32);

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`${state.player1Score}`, 35, cardY + 75);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '12px sans-serif';
  ctx.fillText('PTS', 95, cardY + 75);

  // VS Badge (Center)
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.arc(width / 2, cardY + cardH / 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4B5563';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F3F4F6';
  ctx.font = '900 12px sans-serif';
  ctx.fillText('VS', width / 2, cardY + cardH / 2 + 4);

  // Player 2 Card (Right)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, width - 20 - cardW, cardY, cardW, cardH, 12);
  ctx.fill();
  ctx.strokeStyle = !state.isMyTurn
    ? 'rgba(245, 158, 11, 0.6)'
    : 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#E5E7EB';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(truncateText(state.player2Name, 12), width - 35, cardY + 32);

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`${state.player2Score}`, width - 75, cardY + 75);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '12px sans-serif';
  ctx.fillText('PTS', width - 35, cardY + 75);

  // 4. Turn Status Banner
  const bannerY = 160;
  const bannerH = 46;
  const timerText =
    state.timeLeftSec != null ? ` (${Math.max(0, state.timeLeftSec)}s)` : '';

  if (state.isMyTurn) {
    ctx.fillStyle = 'rgba(0, 168, 132, 0.9)';
    roundRect(ctx, 20, bannerY, width - 40, bannerH, 10);
    ctx.fill();
    ctx.strokeStyle = '#25D366';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 15px sans-serif';
    ctx.fillText(`🟢 YOUR TURN — TAP TO PLAY${timerText}`, width / 2, bannerY + 28);
  } else {
    ctx.fillStyle = 'rgba(31, 44, 52, 0.95)';
    roundRect(ctx, 20, bannerY, width - 40, bannerH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(
      `⏳ WAITING FOR ${state.player2Name.toUpperCase()}${timerText}`,
      width / 2,
      bannerY + 28,
    );
  }

  // 5. Footer Last Move / Action
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#9CA3AF';
  if (state.lastWord) {
    ctx.fillText(
      `⚡ Last played word: "${state.lastWord.toUpperCase()}"`,
      width / 2,
      height - 24,
    );
  } else {
    ctx.fillText('Recess Studio • Real-Time WhatsApp Companion', width / 2, height - 24);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
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
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

/**
 * Starts a live canvas stream Picture-in-Picture window.
 */
export async function startLiveMatchPiP(
  initialState: LivePiPStateSnapshot,
  onExit?: () => void,
): Promise<FloatingPiPController | null> {
  const support = getFloatingPiPSupport();
  if (!support.isSupported || typeof document === 'undefined') {
    return null;
  }

  let currentState = { ...initialState };
  let isRunning = true;

  // 1. Create in-memory canvas
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Initial draw
  renderPiPHUD(ctx, currentState);

  // 2. Setup render loop
  const intervalId = setInterval(() => {
    if (!isRunning) return;
    renderPiPHUD(ctx, currentState);
  }, 100);

  // 3. Setup offscreen video element
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.position = 'fixed';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.left = '-1000px';
  document.body.appendChild(video);

  // Capture canvas stream
  let stream: MediaStream | null = null;
  try {
    if (typeof canvas.captureStream === 'function') {
      stream = canvas.captureStream(15);
    } else if (
      typeof (canvas as unknown as { mozCaptureStream?: (fps: number) => MediaStream })
        .mozCaptureStream === 'function'
    ) {
      stream = (canvas as unknown as { mozCaptureStream: (fps: number) => MediaStream }).mozCaptureStream(15);
    }
  } catch {
    // Stream capture not permitted
  }

  if (!stream) {
    clearInterval(intervalId);
    video.remove();
    return null;
  }

  video.srcObject = stream;

  try {
    await video.play();
  } catch {
    // Autoplay policy or video play error
  }

  const handlePiPExit = () => {
    isRunning = false;
    clearInterval(intervalId);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.remove();
    onExit?.();
  };

  video.addEventListener('leavepictureinpicture', handlePiPExit);
  video.addEventListener('webkitpresentationmodechanged', () => {
    const mode = (video as unknown as { webkitPresentationMode?: string })
      .webkitPresentationMode;
    if (mode === 'inline') {
      handlePiPExit();
    }
  });

  // Request Picture-in-Picture
  try {
    if (typeof video.requestPictureInPicture === 'function') {
      await video.requestPictureInPicture();
    } else if (
      typeof (video as unknown as { webkitSetPresentationMode?: (mode: string) => void })
        .webkitSetPresentationMode === 'function'
    ) {
      (video as unknown as { webkitSetPresentationMode: (mode: string) => void }).webkitSetPresentationMode(
        'picture-in-picture',
      );
    }
  } catch (err) {
    handlePiPExit();
    throw err;
  }

  return {
    isActive: () => isRunning,
    updateState: (newState: LivePiPStateSnapshot) => {
      currentState = { ...newState };
      renderPiPHUD(ctx, currentState);
    },
    stop: async () => {
      handlePiPExit();
      if (document.pictureInPictureElement === video) {
        try {
          await document.exitPictureInPicture();
        } catch {
          // ignore
        }
      }
    },
  };
}
