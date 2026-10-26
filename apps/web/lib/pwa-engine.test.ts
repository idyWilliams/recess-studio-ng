import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canPromptNativeInstall,
  clearAppBadge,
  getNotificationPermission,
  initInstallPromptListener,
  isNotificationSupported,
  notifyTurnReady,
  onInstallPromptChange,
  registerRecessServiceWorker,
  requestNotificationPermission,
  triggerNativeInstall,
  updateAppBadge,
} from './pwa-engine';

class MockEvent {
  type: string;
  defaultPrevented = false;
  constructor(type: string) {
    this.type = type;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

describe('PWA Engine', () => {
  let cleanupListener: (() => void) | null = null;
  let listeners: Record<string, ((e: any) => void)[]> = {};
  let mockWindow: any;
  let mockNotification: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    listeners = {};

    mockNotification = {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    mockWindow = {
      addEventListener: vi.fn((event: string, cb: (e: any) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: (e: any) => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((l) => l !== cb);
        }
      }),
      dispatchEvent: vi.fn((event: any) => {
        const cbs = listeners[event.type] || [];
        cbs.forEach((cb) => cb(event));
        return true;
      }),
      Notification: mockNotification,
    };

    (globalThis as any).window = mockWindow;
    (globalThis as any).Event = MockEvent;
    (globalThis as any).Notification = mockNotification;
  });

  afterEach(() => {
    if (cleanupListener) {
      cleanupListener();
      cleanupListener = null;
    }
    delete (globalThis as any).window;
    delete (globalThis as any).Event;
    delete (globalThis as any).Notification;
  });

  describe('Service Worker Registration', () => {
    it('registers /sw.js with scope "/" when supported', async () => {
      const mockRegister = vi.fn().mockResolvedValue({ scope: '/' });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: mockRegister },
        configurable: true,
      });

      const reg = await registerRecessServiceWorker();
      expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(reg).toEqual({ scope: '/' });
    });

    it('returns null gracefully when registration rejects', async () => {
      const mockRegister = vi.fn().mockRejectedValue(new Error('SW failed'));
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: mockRegister },
        configurable: true,
      });

      const reg = await registerRecessServiceWorker();
      expect(reg).toBeNull();
    });
  });

  describe('Native Install Prompt (beforeinstallprompt)', () => {
    it('captures beforeinstallprompt event and triggers prompt', async () => {
      cleanupListener = initInstallPromptListener();

      let installableState = false;
      const unsubscribe = onInstallPromptChange((canInstall) => {
        installableState = canInstall;
      });

      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const fakeEvent = new MockEvent('beforeinstallprompt') as any;
      fakeEvent.prompt = mockPrompt;
      fakeEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

      mockWindow.dispatchEvent(fakeEvent);

      expect(canPromptNativeInstall()).toBe(true);
      expect(installableState).toBe(true);

      const result = await triggerNativeInstall();
      expect(mockPrompt).toHaveBeenCalled();
      expect(result).toBe('accepted');
      expect(canPromptNativeInstall()).toBe(false);

      unsubscribe();
    });

    it('resets when appinstalled event fires', () => {
      cleanupListener = initInstallPromptListener();

      const fakeEvent = new MockEvent('beforeinstallprompt') as any;
      fakeEvent.prompt = vi.fn().mockResolvedValue(undefined);
      fakeEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
      mockWindow.dispatchEvent(fakeEvent);
      expect(canPromptNativeInstall()).toBe(true);

      mockWindow.dispatchEvent(new MockEvent('appinstalled'));
      expect(canPromptNativeInstall()).toBe(false);
    });

    it('returns unsupported when no prompt is available', async () => {
      const result = await triggerNativeInstall();
      expect(result).toBe('unsupported');
    });
  });

  describe('App Icon Badging', () => {
    it('invokes navigator.setAppBadge with count when count > 0', async () => {
      const mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'setAppBadge', {
        value: mockSetAppBadge,
        configurable: true,
      });

      const success = await updateAppBadge(3);
      expect(mockSetAppBadge).toHaveBeenCalledWith(3);
      expect(success).toBe(true);
    });

    it('invokes navigator.clearAppBadge when count <= 0', async () => {
      const mockClearAppBadge = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: mockClearAppBadge,
        configurable: true,
      });

      const success = await updateAppBadge(0);
      expect(mockClearAppBadge).toHaveBeenCalled();
      expect(success).toBe(true);

      const clearSuccess = await clearAppBadge();
      expect(mockClearAppBadge).toHaveBeenCalledTimes(2);
      expect(clearSuccess).toBe(true);
    });
  });

  describe('Turn Notifications', () => {
    it('detects notification support and permission', () => {
      expect(isNotificationSupported()).toBe(true);
      expect(getNotificationPermission()).toBe('granted');
    });

    it('requests notification permission from user', async () => {
      mockNotification.permission = 'default';

      const perm = await requestNotificationPermission();
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(perm).toBe('granted');
    });

    it('dispatches notification via ServiceWorkerRegistration when available', async () => {
      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            showNotification: mockShowNotification,
          }),
        },
        configurable: true,
      });

      const sent = await notifyTurnReady({
        title: '⚔️ Your Turn in Word Battle!',
        body: '@tunde played. Tap to resume!',
        matchUrl: '/games/word-battle/wb-123',
        tag: 'turn-wb-123',
      });

      expect(sent).toBe(true);
      expect(mockShowNotification).toHaveBeenCalledWith(
        '⚔️ Your Turn in Word Battle!',
        expect.objectContaining({
          body: '@tunde played. Tap to resume!',
          tag: 'turn-wb-123',
          data: { url: '/games/word-battle/wb-123' },
          vibrate: [120, 60, 120],
        }),
      );
    });

    it('returns false when permission is denied', async () => {
      mockNotification.permission = 'denied';

      const sent = await notifyTurnReady({
        title: 'Your Turn',
        body: 'Play now',
        matchUrl: '/games/word-battle/wb-123',
      });

      expect(sent).toBe(false);
    });
  });
});
