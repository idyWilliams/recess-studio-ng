import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadStoredWallet,
  storeWallet,
  loadStoredCustomization,
  storeCustomization,
  STARTER_COIN_AMOUNT,
  AVAILABLE_FLAGS,
  AVAILABLE_AVATARS,
} from './wallet-store';

describe('wallet-store', () => {
  let memoryStorage: Record<string, string> = {};

  beforeEach(() => {
    memoryStorage = {};
    const mockLocalStorage = {
      getItem: (key: string) => memoryStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete memoryStorage[key];
      },
      clear: () => {
        memoryStorage = {};
      },
    };

    // Attach mock window & localStorage
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockLocalStorage,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('provisions starter wallet with 1,000 coins on first load', () => {
    const wallet = loadStoredWallet();
    expect(wallet.coins).toBe(STARTER_COIN_AMOUNT);
    expect(wallet.starterClaimed).toBe(true);
  });

  it('persists and loads updated wallet state', () => {
    storeWallet({
      coins: 1450,
      starterClaimed: true,
      claimedAt: '2026-10-21T12:00:00.000Z',
    });

    const loaded = loadStoredWallet();
    expect(loaded.coins).toBe(1450);
  });

  it('loads default customization with African national flags and avatars', () => {
    const customization = loadStoredCustomization();
    expect(customization.flag).toBe('🇳🇬');
    expect(customization.avatarId).toBe('chidi');
    expect(customization.elo).toBe(1420);

    expect(AVAILABLE_FLAGS.some((f) => f.code === 'NG')).toBe(true);
    expect(AVAILABLE_FLAGS.some((f) => f.code === 'GH')).toBe(true);
    expect(AVAILABLE_AVATARS.some((a) => a.id === 'chidi')).toBe(true);
    expect(AVAILABLE_AVATARS.some((a) => a.id === 'tunde')).toBe(true);
  });

  it('persists player customization changes', () => {
    storeCustomization({
      flag: '🇬🇭',
      countryName: 'Ghana',
      avatarId: 'amina',
      rankTitle: 'Master',
      rankTier: 'Diamond I',
      elo: 1680,
      gamesPlayed: 50,
      winRate: 74,
    });

    const loaded = loadStoredCustomization();
    expect(loaded.flag).toBe('🇬🇭');
    expect(loaded.countryName).toBe('Ghana');
    expect(loaded.avatarId).toBe('amina');
    expect(loaded.elo).toBe(1680);
  });
});
