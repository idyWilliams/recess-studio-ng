import {
  registerUserSchema,
  type AuthUserResponse,
  type GamingProfile,
  type RegisterUserInput,
  type UserAccount,
} from '@recess/shared';

import { AppError } from '../errors/app-error.js';

export interface IdentityRepository {
  createUser(email?: string): Promise<UserAccount>;
  createProfile(
    userId: string,
    username: string,
    avatarUrl?: string,
  ): Promise<GamingProfile>;
  findUserById(userId: string): Promise<UserAccount | null>;
  findProfileByUserId(userId: string): Promise<GamingProfile | null>;
  findProfileById(profileId: string): Promise<GamingProfile | null>;
  findProfileByUsername(username: string): Promise<GamingProfile | null>;
}

export class InMemoryIdentityRepository implements IdentityRepository {
  private users = new Map<string, UserAccount>();
  private profilesByUserId = new Map<string, GamingProfile>();
  private profilesById = new Map<string, GamingProfile>();

  async createUser(email?: string): Promise<UserAccount> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const user: UserAccount = {
      id,
      email: email ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async createProfile(
    userId: string,
    username: string,
    avatarUrl?: string,
  ): Promise<GamingProfile> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const profile: GamingProfile = {
      id,
      userId,
      username,
      avatarUrl: avatarUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.profilesById.set(id, profile);
    this.profilesByUserId.set(userId, profile);
    return profile;
  }

  async findUserById(userId: string): Promise<UserAccount | null> {
    return this.users.get(userId) ?? null;
  }

  async findProfileByUserId(userId: string): Promise<GamingProfile | null> {
    return this.profilesByUserId.get(userId) ?? null;
  }

  async findProfileById(profileId: string): Promise<GamingProfile | null> {
    return this.profilesById.get(profileId) ?? null;
  }

  async findProfileByUsername(username: string): Promise<GamingProfile | null> {
    const normalized = username.toLowerCase();
    for (const profile of this.profilesByUserId.values()) {
      if (profile.username.toLowerCase() === normalized) {
        return profile;
      }
    }
    return null;
  }
}

export class IdentityService {
  constructor(private repo: IdentityRepository = new InMemoryIdentityRepository()) {}

  async registerUser(input: RegisterUserInput): Promise<AuthUserResponse> {
    const parseResult = registerUserSchema.safeParse(input);
    if (!parseResult.success) {
      throw new AppError(
        'INVALID_INPUT',
        parseResult.error.errors[0]?.message ?? 'Invalid registration payload',
        400,
      );
    }

    const existingProfile = await this.repo.findProfileByUsername(input.username);
    if (existingProfile) {
      throw new AppError('USERNAME_TAKEN', 'Username is already taken', 409);
    }

    const user = await this.repo.createUser(input.email);
    const profile = await this.repo.createProfile(
      user.id,
      input.username,
      input.avatarUrl,
    );

    return { user, profile };
  }

  async getAuthUser(userId: string): Promise<AuthUserResponse> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User account not found', 404);
    }

    const profile = await this.repo.findProfileByUserId(userId);
    if (!profile) {
      throw new AppError('UNAUTHORIZED', 'Gaming profile not found', 404);
    }

    return { user, profile };
  }

  async getPublicGamingProfile(profileId: string): Promise<GamingProfile> {
    const profile = await this.repo.findProfileById(profileId);
    if (!profile) {
      throw new AppError('GAME_NOT_FOUND', 'Gaming profile not found', 404);
    }
    return profile;
  }
}
