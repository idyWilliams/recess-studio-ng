'use client';

import { useState } from 'react';
import {
  AVAILABLE_AVATARS,
  AVAILABLE_FLAGS,
  loadStoredCustomization,
  loadStoredWallet,
  storeCustomization,
  storeWallet,
  type PlayerCustomization,
  type WalletState,
} from '@/lib/wallet-store';
import { useIdentity } from '@/hooks/use-identity';
import { USERNAME_REGEX } from '@recess/shared';

interface IdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (customization: PlayerCustomization, wallet: WalletState) => void;
}

export function IdentityModal({ isOpen, onClose, onSaved }: IdentityModalProps) {
  const { profile, register } = useIdentity();
  const [wallet, setWallet] = useState<WalletState>(loadStoredWallet());
  const [customization, setCustomization] = useState<PlayerCustomization>(
    loadStoredCustomization(),
  );
  const [username, setUsername] = useState(
    profile?.username || customization.rankTitle || 'Chidi',
  );
  const [selectedAvatar, setSelectedAvatar] = useState(customization.avatarId);
  const [selectedFlag, setSelectedFlag] = useState(customization.flag);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError('Please choose a username handle');
      return;
    }

    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError('Username must be 3–32 characters, using only letters, numbers, _ or -');
      return;
    }

    setError(null);

    // Find country name for flag
    const flagObj = AVAILABLE_FLAGS.find((f) => f.flag === selectedFlag);

    const updatedCustom: PlayerCustomization = {
      ...customization,
      avatarId: selectedAvatar,
      flag: selectedFlag,
      countryName: flagObj?.name ?? 'Nigeria',
    };

    storeCustomization(updatedCustom);
    setCustomization(updatedCustom);

    // Make sure starter wallet is active
    const activeWallet: WalletState = {
      ...wallet,
      starterClaimed: true,
      coins: wallet.coins || 1000,
    };
    storeWallet(activeWallet);
    setWallet(activeWallet);

    // If username is new and not registered yet, attempt backend registration
    if (!profile || profile.username !== cleanUsername) {
      try {
        await register.mutateAsync(cleanUsername);
      } catch {
        // Even if offline/api unreachable, local store is updated
      }
    }

    setIsSuccess(true);
    if (onSaved) {
      onSaved(updatedCustom, activeWallet);
    }

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 600);
  };

  const currentAvatarUrl =
    AVAILABLE_AVATARS.find((a) => a.id === selectedAvatar)?.url ||
    '/assets/shared/avatars/avatar-chidi.svg';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F19]/95 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-recess-purple/30 blur-3xl" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-recess-purple">
              Player Identity
            </span>
            <h2 id="modal-title" className="text-xl font-extrabold text-white">
              Profile & Arcade Wallet
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Starter Wallet Banner */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 shadow-glow-gold">
              <img
                src="/assets/shared/icons/recess-coin.svg"
                alt="Recess Coin"
                className="h-7 w-7"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-amber-300">
                  {wallet.coins.toLocaleString()} Recess Coins
                </span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-400">
                  Starter Wallet
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Ready for high-stakes arcade matches & wagers
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Identity Preview Card */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="relative">
              <img
                src={currentAvatarUrl}
                alt="Selected avatar"
                className="h-12 w-12 rounded-full border-2 border-recess-purple bg-white/10 p-0.5 shadow-glow-purple"
              />
              <span className="absolute -bottom-1 -right-1 text-base leading-none">
                {selectedFlag}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base">
                  @{username || 'player'}
                </span>
                <span className="rounded bg-recess-purple/30 px-1.5 py-0.5 text-[10px] font-bold text-recess-purple-light">
                  {customization.rankTier}
                </span>
              </div>
              <p className="text-xs text-white/50">
                {customization.rankTitle} • {customization.elo} Elo • {customization.winRate}% Win Rate
              </p>
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label
              htmlFor="username-input"
              className="block text-xs font-bold uppercase tracking-wider text-white/70"
            >
              Gamer Handle
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-white/40">
                @
              </span>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="chidi_pro"
                maxLength={32}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm font-semibold text-white placeholder-white/20 transition-all focus:border-recess-purple focus:bg-white/10 focus:outline-none"
              />
            </div>
            {error && (
              <p className="mt-1 text-xs font-semibold text-rose-400">{error}</p>
            )}
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
              Select Avatar
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2.5">
              {AVAILABLE_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'border-recess-purple bg-recess-purple/20 shadow-glow-purple'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.label}
                      className="h-10 w-10 rounded-full"
                    />
                    <span className="text-[11px] font-bold text-white/80">
                      {avatar.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Country Flag Badge Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
              National Flag Badge
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABLE_FLAGS.map((flagItem) => {
                const isSelected = selectedFlag === flagItem.flag;
                return (
                  <button
                    key={flagItem.code}
                    type="button"
                    onClick={() => setSelectedFlag(flagItem.flag)}
                    className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${
                      isSelected
                        ? 'border-recess-purple bg-recess-purple/25 text-white shadow-glow-purple'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{flagItem.flag}</span>
                    <span className="text-[11px]">{flagItem.code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save / Confirmation Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={register.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-recess-purple via-recess-purple-hover to-recess-blue py-3 text-sm font-extrabold text-white shadow-glow-purple transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
            >
              {isSuccess
                ? '✓ Identity Updated!'
                : register.isPending
                ? 'Saving Profile...'
                : 'Save Player Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
