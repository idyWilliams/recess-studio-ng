import { z } from 'zod';

/**
 * Masks a normalized phone number for privacy (e.g. +2348012345678 -> +234 ••• ••78).
 * Never exposes the private middle digits to opponents or in public directories.
 */
export function maskWhatsAppNumber(phone: string): string {
  if (!phone || phone.length < 6) return '••••••';
  const clean = phone.trim();
  const prefix = clean.startsWith('+') ? clean.slice(0, 4) : clean.slice(0, 3);
  const suffix = clean.slice(-2);
  return `${prefix} ••• ••${suffix}`;
}

/**
 * Normalizes a user-entered phone number into a standard international format.
 */
export function normalizeWhatsAppNumber(phone: string, defaultCountryCode = '+234'): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = defaultCountryCode + cleaned.slice(1);
    } else {
      cleaned = defaultCountryCode + cleaned;
    }
  }
  return cleaned;
}

/**
 * Public gaming identity persona — safe for display to opponents and public lists.
 * Private contact details like WhatsApp phone numbers are NEVER leaked here.
 */
export interface GamingProfile {
  id: string;
  userId: string;
  username: string;
  displayName?: string | null;
  avatarId?: string | null;
  countryFlag?: string | null;
  avatarUrl?: string | null;
  maskedWhatsApp?: string | null;
  whatsappVerified?: boolean;
  elo?: number;
  isOnline?: boolean;
  lastActiveAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sanitized public player directory profile — strictly zero phone numbers.
 */
export interface PublicPlayerProfile {
  id: string;
  username: string;
  displayName?: string | null;
  avatarId?: string | null;
  countryFlag?: string | null;
  avatarUrl?: string | null;
  elo: number;
  isOnline: boolean;
  lastActiveAt: string;
}

/**
 * Real-time aggregated player & match telemetry response.
 */
export interface LivePlayerStatsResponse {
  totalRegisteredPlayers: number;
  onlineNowCount: number;
  activeMatchesCount: number;
  perGameCounts: {
    'word-battle': number;
    'mancala': number;
    'whot': number;
    'ludo': number;
  };
  recentPlayers: PublicPlayerProfile[];
}

/**
 * Internal private account — never expose directly in public endpoints.
 */
export interface UserAccount {
  id: string;
  email?: string | null;
  whatsappNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Combined response payload returned strictly to the account owner (e.g. GET /me).
 */
export interface AuthUserResponse {
  user: UserAccount;
  profile: GamingProfile;
}

/**
 * Result returned upon successful registration, providing credentials/session token.
 */
export interface RegisterResponse {
  user: UserAccount;
  profile: GamingProfile;
  sessionToken: string;
  expiresAt: string;
}

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

export const createGamingProfileSchema = z.object({
  userId: z.string().uuid(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username cannot exceed 32 characters')
    .regex(
      USERNAME_REGEX,
      'Username may only contain letters, numbers, underscores, and hyphens',
    ),
  displayName: z.string().max(64).optional(),
  avatarId: z.string().max(64).optional(),
  countryFlag: z.string().max(8).optional(),
  avatarUrl: z.string().url('Avatar URL must be a valid URL').max(2048).optional(),
});

export type CreateGamingProfileInput = z.infer<typeof createGamingProfileSchema>;

export const updateGamingProfileSchema = z.object({
  username: z.string().min(3).max(32).regex(USERNAME_REGEX).optional(),
  displayName: z.string().max(64).optional(),
  avatarId: z.string().max(64).optional(),
  countryFlag: z.string().max(8).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
});

export type UpdateGamingProfileInput = z.infer<typeof updateGamingProfileSchema>;

export const registerUserSchema = z.object({
  email: z.string().email('Invalid email address').max(320).optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username cannot exceed 32 characters')
    .regex(
      USERNAME_REGEX,
      'Username may only contain letters, numbers, underscores, and hyphens',
    ),
  whatsappNumber: z.string().min(7).max(25).optional(),
  displayName: z.string().max(64).optional(),
  avatarId: z.string().max(64).optional(),
  countryFlag: z.string().max(8).optional(),
  avatarUrl: z.string().url('Avatar URL must be a valid URL').max(2048).optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

