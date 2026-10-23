import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateMatchSnapshotBlob,
  isWebShareFileSupported,
  shareMatchSnapshotToWhatsApp,
  type MatchSnapshotOptions,
} from './share-snapshot';

describe('share-snapshot', () => {
  const mockSnapshotOptions: MatchSnapshotOptions = {
    gameName: 'Word Battle',
    headline: "Tunde's Turn!",
    statusBadge: 'ROUND 4 OF 5',
    playerOne: {
      name: 'Chidi',
      score: 18,
      lives: 3,
      isCurrentTurn: false,
    },
    playerTwo: {
      name: 'Tunde',
      score: 15,
      lives: 2,
      isCurrentTurn: true,
    },
    lastWord: 'SPARK',
    lastScore: 5,
  };

  describe('generateMatchSnapshotBlob', () => {
    it('gracefully returns null in node / non-DOM environment', async () => {
      const blob = await generateMatchSnapshotBlob(mockSnapshotOptions);
      expect(blob).toBeNull();
    });
  });

  describe('isWebShareFileSupported', () => {
    it('returns true when navigator.canShare and navigator.share exist and false otherwise', () => {
      const originalCanShare = (navigator as unknown as { canShare?: unknown }).canShare;
      const originalShare = (navigator as unknown as { share?: unknown }).share;

      try {
        Object.defineProperty(navigator, 'canShare', {
          value: vi.fn().mockReturnValue(true),
          configurable: true,
          writable: true,
        });
        Object.defineProperty(navigator, 'share', {
          value: vi.fn().mockResolvedValue(undefined),
          configurable: true,
          writable: true,
        });

        expect(isWebShareFileSupported()).toBe(true);

        // When canShare is absent
        delete (navigator as unknown as { canShare?: unknown }).canShare;
        expect(isWebShareFileSupported()).toBe(false);
      } finally {
        if (originalCanShare !== undefined) {
          Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true });
        } else {
          delete (navigator as unknown as { canShare?: unknown }).canShare;
        }
        if (originalShare !== undefined) {
          Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
        } else {
          delete (navigator as unknown as { share?: unknown }).share;
        }
      }
    });
  });

  describe('shareMatchSnapshotToWhatsApp', () => {
    let mockWindowOpen: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockWindowOpen = vi.fn();
      (globalThis as unknown as { window: unknown }).window = {
        open: mockWindowOpen,
      };
    });

    afterEach(() => {
      delete (globalThis as unknown as { window?: unknown }).window;
      delete (globalThis as unknown as { document?: unknown }).document;
      delete (navigator as unknown as { canShare?: unknown }).canShare;
      delete (navigator as unknown as { share?: unknown }).share;
    });

    it('falls back to window.open with fallbackUrl when navigator.share is unavailable', async () => {
      const result = await shareMatchSnapshotToWhatsApp({
        snapshotOptions: mockSnapshotOptions,
        shareTitle: 'Recess Studio',
        shareText: 'Your turn!',
        shareUrl: 'https://recess.gg/match?v=4',
        fallbackUrl: 'https://wa.me/?text=fallback',
      });

      expect(result).toBe(true);
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://wa.me/?text=fallback',
        '_blank',
        'noopener,noreferrer',
      );
    });

    it('invokes navigator.share with File when canShare returns true', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      const mockCanShare = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, 'canShare', {
        value: mockCanShare,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
        writable: true,
      });

      // Mock canvas & blob generation in DOM
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      (globalThis as unknown as { document: unknown }).document = {
        createElement: vi.fn().mockReturnValue({
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
            createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            roundRect: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            fillText: vi.fn(),
          }),
          toBlob: (cb: (b: Blob) => void) => cb(mockBlob),
        }),
      };

      const result = await shareMatchSnapshotToWhatsApp({
        snapshotOptions: mockSnapshotOptions,
        shareTitle: 'Recess Studio',
        shareText: 'Your turn!',
        shareUrl: 'https://recess.gg/match?v=4',
        fallbackUrl: 'https://wa.me/?text=fallback',
      });

      expect(result).toBe(true);
      expect(mockCanShare).toHaveBeenCalled();
      expect(mockShare).toHaveBeenCalled();
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('returns false without opening fallback when user aborts the share sheet', async () => {
      const abortError = new Error('User dismissed share dialog');
      abortError.name = 'AbortError';

      const mockShare = vi.fn().mockRejectedValue(abortError);
      const mockCanShare = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, 'canShare', {
        value: mockCanShare,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
        writable: true,
      });

      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      (globalThis as unknown as { document: unknown }).document = {
        createElement: vi.fn().mockReturnValue({
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
            createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            roundRect: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            fillText: vi.fn(),
          }),
          toBlob: (cb: (b: Blob) => void) => cb(mockBlob),
        }),
      };

      const result = await shareMatchSnapshotToWhatsApp({
        snapshotOptions: mockSnapshotOptions,
        shareTitle: 'Recess Studio',
        shareText: 'Your turn!',
        shareUrl: 'https://recess.gg/match?v=4',
        fallbackUrl: 'https://wa.me/?text=fallback',
      });

      expect(result).toBe(false);
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
  });
});
