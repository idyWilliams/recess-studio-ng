'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AudioBus } from '@/components/audio/AudioBus';
import { IdentityModal } from '@/components/profile/IdentityModal';
import { PlayerMedallion } from '@/components/ui/PlayerMedallion';
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
  const [activeChallenge, setActiveChallenge] = useState<{
    id: string;
    challengerUsername: string;
    gameType: string;
    gameName: string;
    matchUrl: string;
    message: string;
  } | null>(null);

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

  // Poll for direct player challenge notifications
  useEffect(() => {
    const targetId = profile?.userId || profile?.id;
    if (!targetId || typeof window === 'undefined') return;

    let isMounted = true;
    const pollNotifications = async () => {
      try {
        const res = await fetch(`/backend-api/players/notifications?userId=${targetId}`);
        if (!res.ok) return;
        const list = await res.json();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const latest = list[0];
          setActiveChallenge((prev) => {
            if (prev?.id !== latest.id) {
              void notifyTurnReady({
                title: `⚔️ @${latest.challengerUsername} challenged you!`,
                body: `Tap to accept duel in ${latest.gameName}`,
                matchUrl: latest.matchUrl,
                tag: `duel-${latest.id}`,
              });
              triggerHaptic('heavy');
            }
            return latest;
          });
        }
      } catch {
        // silent polling catch
      }
    };

    void pollNotifications();
    const interval = setInterval(pollNotifications, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [profile?.userId, profile?.id]);

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

  const displayName = profile?.username || customization.rankTitle || 'Player';

  return (
    <>
      {/* Live Direct Challenge Alert Banner */}
      {activeChallenge && (
        <aside
          aria-label="Direct player challenge alert"
          className="border-b border-white/[0.06] bg-[#161619] px-4 py-2 text-xs text-[#E4E4E0] transition-all animate-in slide-in-from-top duration-300"
        >
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C8B28A]" />
              <p className="truncate text-xs text-[#8E8E93]">
                <strong className="font-medium text-[#F4F4F0]">@{activeChallenge.challengerUsername}</strong> challenged you to {activeChallenge.gameName}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={activeChallenge.matchUrl}
                onClick={async () => {
                  try {
                    await fetch(`/backend-api/players/notifications/${activeChallenge.id}/dismiss`, {
                      method: 'POST',
                    });
                  } catch {}
                  setActiveChallenge(null);
                }}
                className="rounded-lg bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] px-3 py-1 text-xs font-medium transition-all active:scale-95"
              >
                Accept
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch(`/backend-api/players/notifications/${activeChallenge.id}/dismiss`, {
                      method: 'POST',
                    });
                  } catch {}
                  setActiveChallenge(null);
                }}
                className="p-1 text-xs text-[#8E8E93] hover:text-[#F4F4F0]"
                aria-label="Dismiss challenge"
              >
                ✕
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Active Match Handoff Banner */}
      {activeMatchLink && !pathname.startsWith('/games/word-battle') && (
        <aside aria-label="Active match banner" className="border-b border-white/[0.06] bg-[#161619] px-4 py-1.5 text-center transition-all">
          <Link
            href={activeMatchLink}
            className="inline-flex items-center justify-center gap-2 text-xs text-[#8E8E93] hover:text-[#F4F4F0] transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            <span>Active match in progress — Resume turn</span>
            <span className="text-[#F4F4F0]">&rarr;</span>
          </Link>
        </aside>
      )}

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A0A0B]/90 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 sm:px-6">
          {/* Typographic Wordmark: Quiet Luxury Minimalist */}
          <Link
            href="/"
            className="transition-opacity hover:opacity-80 active:scale-98 select-none py-1"
          >
            <span className="text-sm font-semibold tracking-[0.2em] text-[#F4F4F0] uppercase">
              RECESS
            </span>
          </Link>

          {/* Right Controls HUD */}
          <div className="flex items-center gap-2">
            {/* Quick Return to WhatsApp if entered from chat */}
            {isFromWhatsApp && (
              <a
                href="whatsapp://"
                className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#121214] hover:bg-[#18181B] px-3 py-1.5 text-[11px] font-medium text-[#8E8E93] hover:text-[#F4F4F0] transition-all active:scale-95"
                aria-label="Return to WhatsApp"
              >
                <span>WhatsApp</span>
              </a>
            )}

            {/* When NOT installed in standalone mode: Dock App */}
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#121214] hover:bg-[#18181B] px-3 py-1.5 text-[11px] font-medium text-[#8E8E93] hover:text-[#F4F4F0] transition-all active:scale-95"
                aria-label={canNativeInstall ? 'Install Recess App' : 'Dock App'}
              >
                <span>{canNativeInstall ? 'Install' : 'Dock'}</span>
              </button>
            )}

            {/* Audio Toggle */}
            <AudioBus />

            {/* Profile & Wallet Button */}
            <button
              type="button"
              onClick={() => setIsIdentityModalOpen(true)}
              className="group flex items-center gap-2 rounded-full border border-white/[0.07] bg-[#121214] hover:bg-[#18181B] py-1 pl-1.5 pr-3 transition-all active:scale-95"
              aria-label="Open profile and wallet settings"
            >
              <PlayerMedallion
                size="xs"
                username={displayName}
                countryFlag={customization.flag}
              />
              <span className="hidden xs:inline text-xs font-medium text-[#E4E4E0]">@{displayName}</span>
              <span className="text-xs font-medium tabular-nums text-[#C8B28A]">
                {wallet.coins.toLocaleString()}
              </span>
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
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214] p-6 shadow-2xl backdrop-blur-2xl text-[#F4F4F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-base font-medium text-[#F4F4F0]">
                Install Application
              </h3>
              <button
                type="button"
                onClick={() => setIsDockModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] text-[#8E8E93] hover:text-[#F4F4F0]"
              >
                ✕
              </button>
            </div>

            {canNativeInstall && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4F4F0] hover:bg-white py-2.5 text-xs font-medium text-[#0A0A0B] transition-all active:scale-95"
              >
                <span>Install to Home Screen</span>
              </button>
            )}

            <p className="text-xs text-[#8E8E93] leading-relaxed">
              Add Recess to your home screen for fullscreen standalone play:
            </p>

            {/* Dynamic Browser Guidance based on exact User Agent */}
            <div className="space-y-3 rounded-xl bg-[#161619] p-3.5 border border-white/[0.06] text-xs">
              {mobileBrowser === 'ios-chrome' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      1
                    </span>
                    <p className="text-[#8E8E93]">
                      Tap the <strong className="text-[#F4F4F0]">Share icon</strong> in Chrome&apos;s address bar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      2
                    </span>
                    <p className="text-[#8E8E93]">
                      Select <strong className="text-[#F4F4F0]">Add to Home Screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      3
                    </span>
                    <p className="text-[#8E8E93]">
                      Launch Recess directly from your home screen.
                    </p>
                  </div>
                </>
              ) : mobileBrowser === 'android-chrome' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      1
                    </span>
                    <p className="text-[#8E8E93]">
                      Tap the <strong className="text-[#F4F4F0]">three-dots menu</strong> in Chrome.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      2
                    </span>
                    <p className="text-[#8E8E93]">
                      Select <strong className="text-[#F4F4F0]">Install App</strong> or <strong className="text-[#F4F4F0]">Add to Home screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      3
                    </span>
                    <p className="text-[#8E8E93]">
                      Launch Recess with fullscreen standalone performance.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      1
                    </span>
                    <p className="text-[#8E8E93]">
                      Tap the <strong className="text-[#F4F4F0]">Share button</strong> in Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      2
                    </span>
                    <p className="text-[#8E8E93]">
                      Select <strong className="text-[#F4F4F0]">Add to Home Screen</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-[#F4F4F0]">
                      3
                    </span>
                    <p className="text-[#8E8E93]">
                      Launch Recess directly from your home screen.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsDockModalOpen(false)}
              className="w-full rounded-xl bg-[#1A1A1E] hover:bg-[#222227] border border-white/[0.08] py-2.5 text-xs font-medium text-[#E4E4E0] transition-all active:scale-95"
            >
              Close
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
