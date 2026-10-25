'use client';

import { useState, useEffect } from 'react';
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
import { storeIdentity } from '@/lib/identity-store';
import { useIdentity } from '@/hooks/use-identity';
import { normalizeWhatsAppNumber, USERNAME_REGEX } from '@recess/shared';

interface IdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnboarding?: boolean;
  onSaved?: (customization: PlayerCustomization, wallet: WalletState) => void;
}

const DIAL_CODES = [
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
];

export function IdentityModal({
  isOpen,
  onClose,
  isOnboarding = false,
  onSaved,
}: IdentityModalProps) {
  const { profile, register } = useIdentity();
  const [wallet, setWallet] = useState<WalletState>(loadStoredWallet());
  const [customization, setCustomization] = useState<PlayerCustomization>(
    loadStoredCustomization(),
  );

  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(
    profile?.displayName || customization.rankTitle || 'Player',
  );
  const [selectedDialCode, setSelectedDialCode] = useState('+234');
  const [rawPhone, setRawPhone] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(customization.avatarId);
  const [selectedFlag, setSelectedFlag] = useState(customization.flag);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('✓ Profile Saved!');

  // Pre-fill from query params (?wa=... or ?phone=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prefillPhone = params.get('wa') || params.get('phone');
      if (prefillPhone) {
        setRawPhone(prefillPhone.replace(/^\+234/, '').replace(/^\+/, ''));
      }
    }
  }, []);

  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile]);

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

    // Process WhatsApp number if provided
    let fullPhone: string | undefined = undefined;
    const cleanDigits = rawPhone.replace(/[^\d]/g, '');
    if (cleanDigits.length > 0) {
      if (cleanDigits.length < 7) {
        setError('Please enter a valid WhatsApp phone number (at least 7 digits)');
        return;
      }
      fullPhone = normalizeWhatsAppNumber(`${selectedDialCode}${cleanDigits}`);
    } else if (isOnboarding) {
      setError('Please enter your WhatsApp phone number to continue');
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

    const currentAvatarUrl =
      AVAILABLE_AVATARS.find((a) => a.id === selectedAvatar)?.url ||
      '/assets/shared/avatars/avatar-chidi.svg';

    try {
      const res = await register.mutateAsync({
        username: cleanUsername,
        whatsappNumber: fullPhone,
        displayName: displayName || cleanUsername,
        avatarId: selectedAvatar,
        countryFlag: selectedFlag,
        avatarUrl: currentAvatarUrl,
      });

      if (res.profile?.username) {
        setUsername(res.profile.username);
      }
      setSuccessMessage(
        fullPhone ? '✓ WhatsApp Linked & Profile Synced!' : '✓ Profile Updated!',
      );
    } catch {
      // Offline fallback: save locally
      storeIdentity({
        sessionToken: `offline_${Date.now()}`,
        profile: {
          id: `offline_profile_${Date.now()}`,
          userId: `offline_user_${Date.now()}`,
          username: cleanUsername,
          displayName: displayName || cleanUsername,
          avatarId: selectedAvatar,
          countryFlag: selectedFlag,
          avatarUrl: currentAvatarUrl,
          maskedWhatsApp: fullPhone ? '••••••' : null,
          whatsappVerified: Boolean(fullPhone),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      });
      setSuccessMessage('✓ Saved to Local Session');
    }

    setIsSuccess(true);
    if (onSaved) {
      onSaved(updatedCustom, activeWallet);
    }

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 700);
  };

  const currentAvatarUrl =
    AVAILABLE_AVATARS.find((a) => a.id === selectedAvatar)?.url ||
    '/assets/shared/avatars/avatar-chidi.svg';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-md my-auto overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F19]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl text-white">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00A884]">
              {isOnboarding ? 'WhatsApp Onboarding' : 'Player Identity'}
            </span>
            <h2 id="modal-title" className="text-xl font-extrabold text-white">
              {isOnboarding ? 'Connect WhatsApp & Enter' : 'Profile & Arcade Wallet'}
            </h2>
          </div>
          {!isOnboarding && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sync & Account Recovery Hint */}
        <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <span className="text-base">🔄</span>
          <p className="leading-snug">
            <strong>Returning Player?</strong> Entering your WhatsApp number restores your existing gamer tag, rating, and wallet across any browser or Home Screen app!
          </p>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* WhatsApp Phone Number Section */}
          <div>
            <label
              htmlFor="wa-phone-input"
              className="block text-xs font-black uppercase tracking-wider text-emerald-300"
            >
              WhatsApp Phone Number {isOnboarding && <span className="text-rose-400">*</span>}
            </label>
            <div className="mt-1 flex gap-2">
              <select
                value={selectedDialCode}
                onChange={(e) => setSelectedDialCode(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                aria-label="Country dial code"
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code} className="bg-[#0B0F19] text-white">
                    {d.flag} {d.code}
                  </option>
                ))}
              </select>
              <input
                id="wa-phone-input"
                type="tel"
                value={rawPhone}
                onChange={(e) => setRawPhone(e.target.value)}
                placeholder="801 234 5678"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white placeholder-white/20 transition-all focus:border-emerald-500 focus:bg-white/10 focus:outline-none"
              />
            </div>

            {/* Privacy Guarantee Badge */}
            <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-white/50 leading-relaxed">
              <span className="text-emerald-400 shrink-0">🔒</span>
              <span>
                <strong className="text-emerald-300">100% Private:</strong> Recess never displays your phone number to opponents. Players only see your @username.
              </span>
            </div>
          </div>

          {/* Gamer Handle */}
          <div>
            <label
              htmlFor="username-input"
              className="block text-xs font-bold uppercase tracking-wider text-white/70"
            >
              Gamer Handle (@username)
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
            <div className="mt-2 grid grid-cols-4 gap-2">
              {AVAILABLE_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/20 shadow-glow-emerald'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.label}
                      className="h-10 w-10 rounded-full"
                    />
                    <span className="text-[10px] font-bold text-white/80 truncate max-w-full">
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
            <div className="mt-2 flex flex-wrap gap-1.5">
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
                    <span className="text-sm">{flagItem.flag}</span>
                    <span className="text-[10px]">{flagItem.code}</span>
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
              className="w-full rounded-xl bg-gradient-to-r from-[#00A884] via-emerald-600 to-recess-blue py-3 text-sm font-extrabold text-white shadow-glow-emerald transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
            >
              {isSuccess
                ? successMessage
                : register.isPending
                ? 'Syncing with Recess...'
                : isOnboarding
                ? 'Connect & Enter Arcade 🚀'
                : 'Save Player Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
