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

export function AppHeader() {
  const pathname = usePathname();
  const { profile } = useIdentity();
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

  useEffect(() => {
    setWallet(loadStoredWallet());
    setCustomization(loadStoredCustomization());
  }, []);

  // Don't show the standard header inside an active fullscreen game arena
  if (pathname.startsWith('/games/word-battle/')) {
    return null;
  }

  const currentAvatarUrl =
    AVAILABLE_AVATARS.find((a) => a.id === customization.avatarId)?.url ||
    '/assets/shared/avatars/avatar-chidi.svg';

  const displayName = profile?.username || 'Chidi';

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#05070B]/80 backdrop-blur-2xl">
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

              <span className="hidden xs:inline text-white/90">{displayName}</span>

              {/* Starter Coins Badge */}
              <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30">
                <span>🪙</span>
                <span>{wallet.coins.toLocaleString()}</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Persistent Identity Modal */}
      <IdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        onSaved={(newCustom, newWallet) => {
          setCustomization(newCustom);
          setWallet(newWallet);
        }}
      />
    </>
  );
}
