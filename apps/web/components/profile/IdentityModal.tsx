'use client';

import { useState, useEffect } from 'react';
import {
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
import { PlayerMedallion } from '@/components/ui/PlayerMedallion';

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
  const [selectedFlag, setSelectedFlag] = useState(customization.flag);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Profile Saved');

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
        setError('Please enter a valid phone number (at least 7 digits)');
        return;
      }
      fullPhone = normalizeWhatsAppNumber(`${selectedDialCode}${cleanDigits}`);
    } else if (isOnboarding) {
      setError('Please enter your WhatsApp phone number to continue');
      return;
    }

    setError(null);

    const flagObj = AVAILABLE_FLAGS.find((f) => f.flag === selectedFlag);

    const updatedCustom: PlayerCustomization = {
      ...customization,
      flag: selectedFlag,
      countryName: flagObj?.name ?? 'Nigeria',
    };

    storeCustomization(updatedCustom);
    setCustomization(updatedCustom);

    const activeWallet: WalletState = {
      ...wallet,
      starterClaimed: true,
      coins: wallet.coins || 1000,
    };
    storeWallet(activeWallet);
    setWallet(activeWallet);

    try {
      const res = await register.mutateAsync({
        username: cleanUsername,
        whatsappNumber: fullPhone,
        displayName: displayName || cleanUsername,
        avatarId: 'medallion',
        countryFlag: selectedFlag,
      });

      if (res.profile?.username) {
        setUsername(res.profile.username);
      }
      setSuccessMessage(
        fullPhone ? 'WhatsApp Linked & Profile Synced' : 'Profile Updated',
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
          avatarId: 'medallion',
          countryFlag: selectedFlag,
          avatarUrl: null,
          maskedWhatsApp: fullPhone ? '••••••' : null,
          whatsappVerified: Boolean(fullPhone),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      });
      setSuccessMessage('Saved to Local Session');
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214] p-6 shadow-2xl backdrop-blur-2xl text-[#F4F4F0] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h2 id="modal-title" className="text-base font-medium text-[#F4F4F0]">
              {isOnboarding ? 'Join the Lounge' : 'Player Profile'}
            </h2>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              {isOnboarding
                ? 'Your public gaming identity on Recess'
                : 'Manage handle and regional badge'}
            </p>
          </div>
          {!isOnboarding && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] text-[#8E8E93] hover:text-[#F4F4F0] transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Medallion Preview */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <PlayerMedallion
            size="xl"
            username={username || 'Player'}
            displayName={displayName}
            countryFlag={selectedFlag}
            showFlag
          />
          <p className="text-xs text-[#8E8E93]">
            {username ? `@${username}` : '@handle'}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Gamer Handle */}
          <div>
            <label
              htmlFor="username-input"
              className="block text-xs font-medium text-[#8E8E93] uppercase tracking-wider"
            >
              Username Handle
            </label>
            <div className="relative mt-1.5">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-[#52525B]">
                @
              </span>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="handle"
                maxLength={32}
                className="w-full rounded-xl border border-white/[0.08] bg-[#18181B] py-2.5 pl-8 pr-3 text-sm text-[#F4F4F0] placeholder-[#52525B] transition-colors focus:border-white/30 focus:outline-none"
              />
            </div>
            {error && (
              <p className="mt-1 text-xs text-rose-400">{error}</p>
            )}
          </div>

          {/* WhatsApp Phone Number Section */}
          <div>
            <label
              htmlFor="wa-phone-input"
              className="block text-xs font-medium text-[#8E8E93] uppercase tracking-wider"
            >
              WhatsApp Number {isOnboarding && <span className="text-[#C8B28A]">*</span>}
            </label>
            <div className="mt-1.5 flex gap-2">
              <select
                value={selectedDialCode}
                onChange={(e) => setSelectedDialCode(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-[#18181B] px-3 py-2.5 text-xs text-[#F4F4F0] outline-none focus:border-white/30"
                aria-label="Country dial code"
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code} className="bg-[#121214] text-[#F4F4F0]">
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
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#18181B] px-3 py-2.5 text-sm text-[#F4F4F0] placeholder-[#52525B] transition-colors focus:border-white/30 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#52525B]">
              Private &bull; Used only for automated turn notifications. Opponents see only your @handle.
            </p>
          </div>

          {/* Regional Badge Selector */}
          <div>
            <label className="block text-xs font-medium text-[#8E8E93] uppercase tracking-wider">
              Country Badge
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AVAILABLE_FLAGS.map((flagItem) => {
                const isSelected = selectedFlag === flagItem.flag;
                return (
                  <button
                    key={flagItem.code}
                    type="button"
                    onClick={() => setSelectedFlag(flagItem.flag)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors active:scale-95 ${
                      isSelected
                        ? 'border-white/40 bg-white/10 text-[#F4F4F0]'
                        : 'border-white/[0.06] bg-[#18181B] text-[#8E8E93] hover:text-[#F4F4F0]'
                    }`}
                  >
                    <span>{flagItem.flag}</span>
                    <span className="text-[10px]">{flagItem.code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save / Confirmation Button: Solid Warm Alabaster */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={register.isPending}
              className="w-full rounded-xl bg-[#F4F4F0] hover:bg-white py-3 text-sm font-medium text-[#0A0A0B] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSuccess
                ? successMessage
                : register.isPending
                ? 'Syncing profile...'
                : isOnboarding
                ? 'Continue to Lounge'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
