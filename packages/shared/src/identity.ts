import { z } from 'zod';

/**
 * Public gaming identity persona — safe for display to opponents and public lists.
 */
export interface GamingProfile {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Internal private account — never expose directly in public endpoints.
 */
export interface UserAccount {
  id: string;
  email?: string | null;
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
  avatarUrl: z.string().url('Avatar URL must be a valid URL').max(2048).optional(),
});

export type CreateGamingProfileInput = z.infer<typeof createGamingProfileSchema>;

export const updateGamingProfileSchema = z.object({
  username: z.string().min(3).max(32).regex(USERNAME_REGEX).optional(),
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
  avatarUrl: z.string().url('Avatar URL must be a valid URL').max(2048).optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
