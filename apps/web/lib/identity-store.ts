import type { GamingProfile } from '@recess/shared';

/**
 * Locally persisted credentials for the current player. This is private account
 * material — only the public `profile` fields are ever rendered to other players.
 */
export interface StoredIdentity {
  sessionToken: string;
  profile: GamingProfile;
  expiresAt: string;
}

const STORAGE_KEY = 'recess.identity';

function isGamingProfile(value: unknown): value is GamingProfile {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<GamingProfile>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.username === 'string'
  );
}

/** Reads the stored identity; returns null on the server, when absent, or when malformed. */
export function loadStoredIdentity(): StoredIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<StoredIdentity>;
    if (
      typeof candidate.sessionToken !== 'string' ||
      candidate.sessionToken.length === 0 ||
      !isGamingProfile(candidate.profile) ||
      typeof candidate.expiresAt !== 'string'
    ) {
      return null;
    }
    return {
      sessionToken: candidate.sessionToken,
      profile: candidate.profile,
      expiresAt: candidate.expiresAt,
    };
  } catch {
    // Corrupted storage is treated as signed out.
    return null;
  }
}

export function storeIdentity(identity: StoredIdentity): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function clearStoredIdentity(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
