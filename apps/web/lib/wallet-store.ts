'use client';

/**
 * Client-side persistent wallet and profile settings for Recess Studio.
 * Handles starter coin provisioning (🪙 1,000 coins), player country flag,
 * custom avatar choice, and ranking stats stored in localStorage.
 */

export interface WalletState {
  coins: number;
  starterClaimed: boolean;
  claimedAt: string;
}

export interface PlayerCustomization {
  flag: string; // e.g., '🇳🇬', '🇬🇭', '🇰🇪', '🇿🇦', '🇬🇧', '🇺🇸'
  countryName: string;
  avatarId: string;
  rankTitle: string;
  rankTier: string;
  elo: number;
  gamesPlayed: number;
  winRate: number;
}

const WALLET_STORAGE_KEY = 'recess.wallet';
const CUSTOMIZATION_STORAGE_KEY = 'recess.player_customization';

export const STARTER_COIN_AMOUNT = 1000;

export const AVAILABLE_FLAGS = [
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'JM', flag: '🇯🇲', name: 'Jamaica' },
] as const;

export const AVAILABLE_AVATARS = [
  { id: 'chidi', label: 'Chidi', url: '/assets/shared/avatars/avatar-chidi.svg' },
  { id: 'tunde', label: 'Tunde', url: '/assets/shared/avatars/avatar-tunde.svg' },
  { id: 'amina', label: 'Amina', url: '/assets/shared/avatars/avatar-amina.svg' },
  { id: 'efe', label: 'Efe', url: '/assets/shared/avatars/avatar-efe.svg' },
] as const;

const DEFAULT_WALLET: WalletState = {
  coins: STARTER_COIN_AMOUNT,
  starterClaimed: true,
  claimedAt: new Date().toISOString(),
};

const DEFAULT_CUSTOMIZATION: PlayerCustomization = {
  flag: '🇳🇬',
  countryName: 'Nigeria',
  avatarId: 'chidi',
  rankTitle: 'Grandmaster',
  rankTier: 'Gold III',
  elo: 1420,
  gamesPlayed: 24,
  winRate: 68,
};

export function loadStoredWallet(): WalletState {
  if (typeof window === 'undefined') return DEFAULT_WALLET;
  try {
    const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) {
      // First time visitor: provision starter wallet immediately!
      storeWallet(DEFAULT_WALLET);
      return DEFAULT_WALLET;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed?.coins === 'number') {
      return parsed as WalletState;
    }
    return DEFAULT_WALLET;
  } catch {
    return DEFAULT_WALLET;
  }
}

export function storeWallet(wallet: WalletState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStoredCustomization(): PlayerCustomization {
  if (typeof window === 'undefined') return DEFAULT_CUSTOMIZATION;
  try {
    const raw = window.localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
    if (!raw) {
      storeCustomization(DEFAULT_CUSTOMIZATION);
      return DEFAULT_CUSTOMIZATION;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CUSTOMIZATION,
      ...parsed,
    };
  } catch {
    return DEFAULT_CUSTOMIZATION;
  }
}

export function storeCustomization(customization: PlayerCustomization): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify(customization),
    );
  } catch {
    // Ignore storage quota errors
  }
}
