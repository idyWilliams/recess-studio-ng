/**
 * Recess Studio — Tactile Haptic Engine
 * Provides dual-mode tactile feedback:
 * 1. Native navigator.vibrate() on Android and supported devices.
 * 2. Ultra-short low-frequency audio tactile pulse (45Hz–80Hz) on iOS devices
 *    creating a physical vibration sensation through the speaker enclosure.
 */

export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning';

const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  selection: 8,
  medium: 25,
  heavy: 45,
  success: [15, 40, 30],
  warning: [30, 50, 30, 50, 40],
};

// Lazy AudioContext for iOS physical vibration synthesis
let tactileAudioCtx: AudioContext | null = null;

function getTactileAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!tactileAudioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        tactileAudioCtx = new AudioContextClass();
      }
    }
    if (tactileAudioCtx && tactileAudioCtx.state === 'suspended') {
      void tactileAudioCtx.resume();
    }
    return tactileAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays an ultra-short, sub-bass burst that resonates the mobile chassis
 * like a physical haptic actuator.
 */
function synthesizeTactilePulse(pattern: HapticPattern): void {
  const ctx = getTactileAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    osc.type = 'triangle';

    let freq = 60;
    let duration = 0.015;
    let peakGain = 0.6;

    switch (pattern) {
      case 'light':
      case 'selection':
        freq = 75;
        duration = 0.012;
        peakGain = 0.4;
        break;
      case 'medium':
        freq = 55;
        duration = 0.022;
        peakGain = 0.6;
        break;
      case 'heavy':
        freq = 45;
        duration = 0.035;
        peakGain = 0.8;
        break;
      case 'success':
        freq = 80;
        duration = 0.03;
        peakGain = 0.5;
        break;
      case 'warning':
        freq = 40;
        duration = 0.04;
        peakGain = 0.7;
        break;
    }

    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Graceful silence if audio node creation fails
  }
}

/**
 * Triggers physical haptic feedback across Android (Vibration API) and iOS (Tactile synthesis).
 */
export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (typeof window === 'undefined') return;

  let hasVibrated = false;

  // 1. Hardware vibration on Android / supported devices
  if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      hasVibrated = navigator.vibrate(VIBRATION_PATTERNS[pattern]);
    } catch {
      hasVibrated = false;
    }
  }

  // 2. Synthesize tactile audio pulse on iOS or if navigator.vibrate is inactive
  if (!hasVibrated) {
    synthesizeTactilePulse(pattern);
  }
}
