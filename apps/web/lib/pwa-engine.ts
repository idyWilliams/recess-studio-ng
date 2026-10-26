/**
 * Recess Studio — PWA Engine
 * Manages Service Worker lifecycle, native Android/Desktop install prompts (beforeinstallprompt),
 * Home Screen icon badging (navigator.setAppBadge), and lock-screen turn notifications.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global in-memory state across React mounts
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();
let isInstallListenerInitialized = false;

/**
 * Initializes listeners for beforeinstallprompt and appinstalled.
 * Returns an unbind cleanup function.
 */
export function initInstallPromptListener(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (isInstallListenerInitialized) {
    return () => {};
  }
  isInstallListenerInitialized = true;

  const handleBeforeInstallPrompt = (event: Event) => {
    // Prevent the default mini-infobar on mobile Chrome
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    installListeners.forEach((listener) => listener(true));
  };

  const handleAppInstalled = () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
    isInstallListenerInitialized = false;
  };
}

/**
 * Subscribe to changes in native installability (e.g. when beforeinstallprompt fires).
 */
export function onInstallPromptChange(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(deferredInstallPrompt !== null);
  return () => {
    installListeners.delete(callback);
  };
}

/**
 * Returns whether a native 1-tap install prompt is ready to be shown.
 */
export function canPromptNativeInstall(): boolean {
  return deferredInstallPrompt !== null;
}

/**
 * Triggers the browser's native 1-tap install dialog.
 */
export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
  if (!deferredInstallPrompt) {
    return 'unsupported';
  }

  try {
    const promptEvent = deferredInstallPrompt;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return choice.outcome;
  } catch (error) {
    console.warn('[PWA] Error triggering native install prompt:', error);
    return 'dismissed';
  }
}

/**
 * Registers /sw.js on client mount.
 */
export async function registerRecessServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Updates the phone's Home Screen app icon badge count (iOS 16.4+ Home Screen PWA & Android/Desktop).
 */
export async function updateAppBadge(count: number): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (count > 0 && 'setAppBadge' in navigator) {
      await navigator.setAppBadge(count);
      return true;
    }
    if (count <= 0 && 'clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
      return true;
    }
  } catch (error) {
    // Ignore unsupported or restricted context errors gracefully
    console.debug('[PWA] App badge update skipped:', error);
  }

  return false;
}

/**
 * Clears the Home Screen badge count.
 */
export async function clearAppBadge(): Promise<boolean> {
  return updateAppBadge(0);
}

/**
 * Check if the browser supports notifications.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request OS permission for notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('[PWA] Notification permission request error:', error);
    return 'denied';
  }
}

export interface TurnNotificationOptions {
  title: string;
  body: string;
  matchUrl: string;
  tag?: string;
}

/**
 * Dispatches an OS lock-screen turn notification.
 * Prefers ServiceWorkerRegistration.showNotification() so lock-screen clicks
 * directly route to the installed Home Screen PWA!
 */
export async function notifyTurnReady(options: TurnNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !isNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions = {
    body: options.body,
    icon: '/assets/shared/icons/recess-coin.svg',
    badge: '/assets/shared/icons/recess-coin.svg',
    tag: options.tag || 'recess-turn-alert',
    data: {
      url: options.matchUrl,
    },
    // Vibration pattern: short alert (120ms), pause (60ms), short alert (120ms)
    // @ts-expect-error - vibrate is supported in browser notification options
    vibrate: [120, 60, 120],
  };

  try {
    // 1. Try ServiceWorker registration first (required for background lock-screen notifications on iOS/Android PWA)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(options.title, notificationOptions);
        return true;
      }
    }

    // 2. Fallback to native window Notification constructor
    new Notification(options.title, notificationOptions);
    return true;
  } catch (error) {
    console.warn('[PWA] Failed to dispatch turn notification:', error);
    return false;
  }
}
