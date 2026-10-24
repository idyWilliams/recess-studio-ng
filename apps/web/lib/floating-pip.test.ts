import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getFloatingPiPSupport,
  renderPiPHUD,
  startLiveMatchPiP,
  type LivePiPStateSnapshot,
} from './floating-pip';

describe('floating-pip engine', () => {
  const sampleState: LivePiPStateSnapshot = {
    gameTitle: 'Word Battle',
    player1Name: 'Chidi',
    player1Score: 24,
    player2Name: 'Tunde',
    player2Score: 19,
    isMyTurn: true,
    timeLeftSec: 12,
    lastWord: 'SPARK',
  };

  class MockHTMLVideoElement {
    style: Record<string, string> = {};
    muted = false;
    playsInline = false;
    autoplay = false;
    srcObject: unknown = null;
    private listeners: Record<string, (() => void)[]> = {};

    addEventListener(event: string, cb: () => void) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    }

    removeEventListener(event: string, cb: () => void) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
      }
    }

    remove = vi.fn();
    play = vi.fn().mockResolvedValue(undefined);
    requestPictureInPicture = vi.fn().mockResolvedValue({} as PictureInPictureWindow);
  }

  class MockHTMLCanvasElement {
    width = 0;
    height = 0;
    getContext = vi.fn();
    captureStream = vi.fn();
  }

  beforeEach(() => {
    (globalThis as unknown as { HTMLVideoElement: unknown }).HTMLVideoElement = MockHTMLVideoElement;
    (globalThis as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement = MockHTMLCanvasElement;
  });

  afterEach(() => {
    delete (globalThis as unknown as { HTMLVideoElement?: unknown }).HTMLVideoElement;
    delete (globalThis as unknown as { HTMLCanvasElement?: unknown }).HTMLCanvasElement;
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  describe('getFloatingPiPSupport', () => {
    it('detects documentPictureInPicture when present in window', () => {
      (globalThis as unknown as { window: { documentPictureInPicture: unknown } }).window = {
        documentPictureInPicture: {},
      };
      const support = getFloatingPiPSupport();
      expect(support.isSupported).toBe(true);
      expect(support.mode).toBe('document');
    });

    it('detects video requestPictureInPicture when HTMLVideoElement supports it', () => {
      (globalThis as unknown as { window: Record<string, unknown> }).window = {};
      MockHTMLVideoElement.prototype.requestPictureInPicture = vi.fn();

      const support = getFloatingPiPSupport();
      expect(support.isSupported).toBe(true);
      expect(support.mode).toBe('video');
    });

    it('detects webkitSetPresentationMode for iOS Safari', () => {
      (globalThis as unknown as { window: Record<string, unknown> }).window = {};
      delete (MockHTMLVideoElement.prototype as unknown as { requestPictureInPicture?: unknown })
        .requestPictureInPicture;

      (
        MockHTMLVideoElement.prototype as unknown as {
          webkitSetPresentationMode?: unknown;
        }
      ).webkitSetPresentationMode = vi.fn();

      const support = getFloatingPiPSupport();
      expect(support.isSupported).toBe(true);
      expect(support.mode).toBe('video');
    });

    it('returns none when no PiP capability exists', () => {
      (globalThis as unknown as { window: Record<string, unknown> }).window = {};
      delete (MockHTMLVideoElement.prototype as unknown as { requestPictureInPicture?: unknown })
        .requestPictureInPicture;
      delete (
        MockHTMLVideoElement.prototype as unknown as {
          webkitSetPresentationMode?: unknown;
        }
      ).webkitSetPresentationMode;

      const support = getFloatingPiPSupport();
      expect(support.isSupported).toBe(false);
      expect(support.mode).toBe('none');
    });
  });

  describe('renderPiPHUD', () => {
    it('draws player scores, turn banner, and last word to canvas context', () => {
      const fillTextSpy = vi.fn();
      const strokeSpy = vi.fn();
      const fillSpy = vi.fn();
      const fillRectSpy = vi.fn();

      const mockCtx = {
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
        }),
        createRadialGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
        }),
        fillRect: fillRectSpy,
        fillText: fillTextSpy,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: fillSpy,
        stroke: strokeSpy,
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      renderPiPHUD(mockCtx, sampleState);

      // Verify header, scores, and turn banner were rendered
      expect(fillRectSpy).toHaveBeenCalled();
      const calledStrings = fillTextSpy.mock.calls.map((c) => String(c[0]));
      expect(calledStrings).toContain('RECESS STUDIO');
      expect(calledStrings).toContain('• WORD BATTLE');
      expect(calledStrings).toContain('Chidi');
      expect(calledStrings).toContain('24');
      expect(calledStrings).toContain('Tunde');
      expect(calledStrings).toContain('19');
      expect(calledStrings.some((s) => s.includes('YOUR TURN'))).toBe(true);
      expect(calledStrings.some((s) => s.includes('SPARK'))).toBe(true);
    });

    it('renders opponent turn banner when isMyTurn is false', () => {
      const fillTextSpy = vi.fn();
      const mockCtx = {
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        fillRect: vi.fn(),
        fillText: fillTextSpy,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      renderPiPHUD(mockCtx, {
        ...sampleState,
        isMyTurn: false,
        timeLeftSec: 8,
      });

      const calledStrings = fillTextSpy.mock.calls.map((c) => String(c[0]));
      expect(calledStrings.some((s) => s.includes('WAITING FOR TUNDE (8s)'))).toBe(true);
    });
  });

  describe('startLiveMatchPiP lifecycle', () => {
    let mockTrackStop: ReturnType<typeof vi.fn>;
    let mockExitPiP: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockTrackStop = vi.fn();
      mockExitPiP = vi.fn().mockResolvedValue(undefined);

      (globalThis as unknown as { window: { documentPictureInPicture: unknown } }).window = {
        documentPictureInPicture: {},
      };

      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: mockTrackStop }]),
      };

      const mockCtx = {
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
      };

      const mockBody = {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      };

      (globalThis as unknown as { document: unknown }).document = {
        body: mockBody,
        createElement: vi.fn((tagName: string) => {
          if (tagName === 'canvas') {
            const canvas = new MockHTMLCanvasElement();
            canvas.getContext = vi.fn().mockReturnValue(mockCtx);
            canvas.captureStream = vi.fn().mockReturnValue(mockStream);
            return canvas;
          }
          if (tagName === 'video') {
            const video = new MockHTMLVideoElement();
            return video;
          }
          return {};
        }),
        exitPictureInPicture: mockExitPiP,
        pictureInPictureElement: null,
      };
    });

    it('starts PiP stream, updates state, and cleans up on stop', async () => {
      const onExit = vi.fn();
      const controller = await startLiveMatchPiP(sampleState, onExit);

      expect(controller).not.toBeNull();
      if (!controller) return;

      expect(controller.isActive()).toBe(true);

      // Update state live
      controller.updateState({
        ...sampleState,
        player1Score: 30,
        isMyTurn: false,
      });
      expect(controller.isActive()).toBe(true);

      // Stop controller
      await controller.stop();
      expect(controller.isActive()).toBe(false);
      expect(mockTrackStop).toHaveBeenCalled();
      expect(onExit).toHaveBeenCalled();
    });
  });
});

