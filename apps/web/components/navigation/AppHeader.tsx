'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AudioBus } from '@/components/audio/AudioBus';
import { IdentityModal } from '@/components/profile/IdentityModal';
import {
  AVAILABLE_AVATARS,
  loadStoredCustomization,
  loadStoredWallet,
  type PlayerCustomization,
  type WalletState,
} from '@/lib/wallet-store';
import { useIdentity } from '@/hooks/use-identity';
import { detectMobileBrowser, type MobileBrowserType } from '@/lib/browser-detect';
import {
  initInstallPromptListener,
  onInstallPromptChange,
  canPromptNativeInstall,
  triggerNativeInstall,
  registerRecessServiceWorker,
  getNotificationPermission,
  requestNotificationPermission,
  notifyTurnReady,
} from '@/lib/pwa-engine';
import { triggerHaptic } from '@/lib/haptics';

export { detectMobileBrowser, type MobileBrowserType };

export function AppHeader() {
  const pathname = usePathname();
  const { profile, isWhatsAppConnected } = useIdentity();
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletState>({
    coins: 1000,
    starterClaimed: true,
    claimedAt: '',
  });
  const [customization, setCustomization] = useState<PlayerCustomization>({
    flag: '🇳🇬',
    countryName: 'Nigeria',
    avatarId: 'chidi',
    rankTitle: 'Grandmaster',
    rankTier: 'Gold III',
    elo: 1420,
    gamesPlayed: 24,
    winRate: 68,
  });

  const [isDockModalOpen, setIsDockModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isFromWhatsApp, setIsFromWhatsApp] = useState(false);
  const [mobileBrowser, setMobileBrowser] = useState<MobileBrowserType>('desktop');
  const [activeMatchLink, setActiveMatchLink] = useState<string | null>(null);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setWallet(loadStoredWallet());
    setCustomization(loadStoredCustomization());

    if (typeof window !== 'undefined') {
      void registerRecessServiceWorker();
      const cleanupPrompt = initInstallPromptListener();
      const cleanupChange = onInstallPromptChange((canInstall) => {
        setCanNativeInstall(canInstall);
      });
      setNotificationPerm(getNotificationPermission());

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(standalone));
      setMobileBrowser(detectMobileBrowser(window.navigator.userAgent));

      const referrer = document.referrer || '';
      const params = new URLSearchParams(window.location.search);
      const fromWa =
        referrer.includes('whatsapp') ||
        params.get('source') === 'whatsapp' ||
        params.get('wa') === '1' ||
        sessionStorage.getItem('recess_entered_wa') === '1';

      if (fromWa) {
        setIsFromWhatsApp(true);
        sessionStorage.setItem('recess_entered_wa', '1');
      }

      const storedMatch = window.localStorage.getItem('recess.last_active_match');
      if (storedMatch) {
        setActiveMatchLink(storedMatch);
      }

      return () => {
        cleanupPrompt();
        cleanupChange();
      };
    }
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic('selection');
    if (canPromptNativeInstall()) {
      const outcome = await triggerNativeInstall();
      if (outcome === 'accepted') {
        return;
      }
    }
    setIsDockModalOpen(true);
  };

  const handleAlertsToggle = async () => {
    triggerHaptic('medium');
    const perm = await requestNotificationPermission();
    setNotificationPerm(perm);
    if (perm === 'granted') {
      triggerHaptic('success');
      await notifyTurnReady({
        title: '🔔 Recess Turn Alerts Active!',
        body: 'You will receive instant lock-screen alerts when opponents make a move.',
        matchUrl: '/',
        tag: 'recess-welcome-alert',
      });
    }
  };

  // Auto-prompt onboarding once if WhatsApp is not yet connected
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      !isWhatsAppConnected &&
      !sessionStorage.getItem('recess_onboarding_shown')
    ) {
      const timer = setTimeout(() => {
        setIsIdentityModalOpen(true);
        sessionStorage.setItem('recess_onboarding_shown', '1');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isWhatsAppConnected]);

  // Don't show the standard header inside an active fullscreen game arena
  if (pathname.startsWith('/games/word-battle/')) {
    return null;
  }

  const currentAvatarUrl =
    AVAILABLE_AVATARS.find((a) => a.id === customization.avatarId)?.url ||
    '/assets/shared/avatars/avatar-chidi.svg';

  const displayName = profile?.username || customization.rankTitle || 'Player';

  return (
    <>
      {/* Active Match Handoff Banner */}
      {activeMatchLink && !pathname.startsWith('/games/word-battle') && (
        <aside aria-label="Active match banner" className="bg-gradient-to-r from-recess-purple via-emerald-600 to-recess-blue px-3 py-1.5 text-center shadow-lg transition-all">
          <Link
            href={activeMatchLink}
            className="flex items-center justify-center gap-2 text-xs font-black text-white hover:underline active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span>⚔️ Active Match Waiting — Tap to Resume Here in Fullscreen &rarr;</span>
          </Link>
        </aside>
      )}

      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#05070B]/80 backdrop-blur-2xl pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-transform active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-recess-purple to-recess-blue text-white shadow-glow-purple select-none">
              <span className="text-base font-black tracking-tight">R</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-none">
                Arcade
              </p>
              <h2 className="text-base font-extrabold tracking-tight text-white leading-tight">
                Recess
              </h2>
            </div>
          </Link>

          {/* Right Controls HUD */}
          <div className="flex items-center gap-2">
            {/* Quick Return to WhatsApp if entered from chat */}
            {isFromWhatsApp && (
              <a
                href="whatsapp://"
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition-all active:scale-95"
                aria-label="Return to WhatsApp"
              >
                <img
                  src="/assets/shared/icons/icon-whatsapp.svg"
                  alt=""
                  className="h-3.5 w-3.5"
                />
                <span className="hidden xs:inline">WhatsApp</span>
              </a>
            )}

            {/* When NOT installed in standalone mode: Dock / Install App */}
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition-all active:scale-95"
                aria-label={canNativeInstall ? 'Install Recess App' : 'Dock as Fullscreen Mini-App'}
              >
                <span>📲</span>
                <span className="hidden xs:inline">
                  {canNativeInstall ? 'Install App' : 'Dock App'}
                </span>
              </button>
            )}

            {/* When installed in Home Screen PWA: OS Lock-Screen Turn Alerts Toggle */}
            {isStandalone && (
              <button
                type="button"
                onClick={handleAlertsToggle}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 ${
                  notificationPerm === 'granted'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-glow-green'
                    : 'border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                }`}
                aria-label="Toggle Turn Notifications"
              >
                {notificationPerm === 'granted' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="hidden xs:inline">Alerts On</span>
                  </>
                ) : (
                  <>
                    <span>🔔</span>
                    <span className="hidden xs:inline">Turn Alerts</span>
                  </>
                )}
              </button>
            )}

            {/* Global Lo-Fi African Jazz Audio HUD Pill */}
            <AudioBus />

            {/* Profile & Wallet Button */}
            <button
              type="button"
              onClick={() => setIsIdentityModalOpen(true)}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/[0.10] py-1 pl-1.5 pr-3 text-xs font-semibold text-white shadow-sm backdrop-blur-xl transition-all active:scale-95"
              aria-label="Open profile and wallet settings"
            >
              <div className="relative">
                <img
                  src={currentAvatarUrl}
                  alt={displayName}
                  className="h-6 w-6 rounded-full border border-white/20 bg-white/5"
                />
                <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">
                  {customization.flag}
                </span>
              </div>

              <span className="hidden xs:inline text-white/90">@{displayName}</span>

              {/* Starter Coins Badge */}
              <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30">
                <span>🪙</span>
                <span>{wallet.coins.toLocaleString()}</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Browser-Aware Dock as Fullscreen Mini-App Modal */}
      {isDockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F19]/95 p-6 shadow-2xl backdrop-blur-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <h3 className="text-base font-extrabold text-white">
                  Fullscreen Mini-App
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDockModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              >
                ✕
              </button>
            </div>

            {canNativeInstall && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-recess-blue py-3 text-xs font-black text-white shadow-glow-emerald transition-all active:scale-95"
              >
                <span>⚡</span>
                <span>1-Tap Install Recess App</span>
              </button>
            )}

            <p className="text-xs text-white/70 leading-relaxed">
              Remove the browser URL and navigation bars for 100% fullscreen WhatsApp Mini-App gaming:
            </p>

            {/* Dynamic Browser Guidance based on exact User Agent */}
            <div className="space-y-3 rounded-2xl bg-white/[0.04] p-3.5 border border-white/10 text-xs">
              {mobileBrowser === 'ios-chrome' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-recess-purple/30 text-[10px] font-bold text-recess-purple-light">
                      1
                    </span>
                    <p className="text-white/80">
                      Look at the <strong className="text-white">top-right corner</strong> of Chrome's address bar and tap the <strong className="text-emerald-300">Share icon (↗)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 text-[10px] font-bold text-emerald-300">
                      2
                    </span>
                    <p className="text-white/80">
                      Scroll down the iOS menu and tap <strong className="text-white">Add to Home Screen (+)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/30 text-[10px] font-bold text-amber-300">
                      3
                    </span>
                    <p className="text-white/80">
                      Launch <strong className="text-white">Recess</strong> from your Home Screen. Your WhatsApp number automatically syncs your active matches!
                    </p>
                  </div>
                </>
              ) : mobileBrowser === 'android-chrome' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-recess-purple/30 text-[10px] font-bold text-recess-purple-light">
                      1
                    </span>
                    <p className="text-white/80">
                      Tap the <strong className="text-white">3-dots menu (⋮)</strong> in Chrome's top-right corner.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 text-[10px] font-bold text-emerald-300">
                      2
                    </span>
                    <p className="text-white/80">
                      Select <strong className="text-white">Install App</strong> or <strong className="text-white">Add to Home screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/30 text-[10px] font-bold text-amber-300">
                      3
                    </span>
                    <p className="text-white/80">
                      Play with automatic WhatsApp link-capturing and fullscreen WebAPK performance!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-recess-purple/30 text-[10px] font-bold text-recess-purple-light">
                      1
                    </span>
                    <p className="text-white/80">
                      Look at the <strong className="text-white">bottom Safari bar</strong> and tap the <strong className="text-emerald-300">Share icon (⎋)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 text-[10px] font-bold text-emerald-300">
                      2
                    </span>
                    <p className="text-white/80">
                      Select <strong className="text-white">Add to Home Screen (⊞)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/30 text-[10px] font-bold text-amber-300">
                      3
                    </span>
                    <p className="text-white/80">
                      Launch Recess directly from your home screen for zero URL-bar distractions!
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsDockModalOpen(false)}
              className="w-full rounded-xl bg-gradient-to-r from-recess-purple to-emerald-600 py-2.5 text-xs font-black text-white shadow-glow-emerald transition-all active:scale-95"
            >
              ✓ Got It!
            </button>
          </div>
        </div>
      )}

      {/* Persistent / Onboarding Identity Modal */}
      <IdentityModal
        isOpen={isIdentityModalOpen}
        isOnboarding={!isWhatsAppConnected}
        onClose={() => setIsIdentityModalOpen(false)}
        onSaved={(newCustom, newWallet) => {
          setCustomization(newCustom);
          setWallet(newWallet);
        }}
      />
    </>
  );
}
