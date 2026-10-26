import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { triggerHaptic } from './haptics';

describe('Tactile Haptic Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = {};
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('triggers hardware navigator.vibrate when supported', () => {
    const mockVibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
    });

    triggerHaptic('light');
    expect(mockVibrate).toHaveBeenCalledWith(10);

    triggerHaptic('success');
    expect(mockVibrate).toHaveBeenCalledWith([15, 40, 30]);

    triggerHaptic('warning');
    expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30, 50, 40]);
  });

  it('falls back to Web Audio tactile synthesis when vibration returns false or is unsupported', () => {
    const mockSetValueAtTime = vi.fn();
    const mockExponentialRamp = vi.fn();
    const mockConnect = vi.fn();
    const mockStart = vi.fn();
    const mockStop = vi.fn();

    const mockOscillator = {
      type: 'triangle',
      frequency: { setValueAtTime: mockSetValueAtTime },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
    };

    const mockGain = {
      gain: {
        setValueAtTime: mockSetValueAtTime,
        exponentialRampToValueAtTime: mockExponentialRamp,
      },
      connect: mockConnect,
    };

    const mockAudioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      currentTime: 0,
      createOscillator: () => mockOscillator,
      createGain: () => mockGain,
      destination: {},
    }));

    (globalThis as any).window = {
      AudioContext: mockAudioContext,
    };

    // Disallow navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockReturnValue(false),
      configurable: true,
    });

    expect(() => triggerHaptic('medium')).not.toThrow();
  });
});
