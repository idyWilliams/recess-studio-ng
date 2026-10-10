import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';

import { gamingProfiles, sessions, users, type Database } from '@recess/database';
import {
  registerUserSchema,
  type AuthUserResponse,
  type GamingProfile,
  type RegisterResponse,
  type RegisterUserInput,
  type UserAccount,
} from '@recess/shared';

import { AppError } from '../errors/app-error.js';

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

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
  createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<SessionRecord>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  deleteSession(sessionId: string): Promise<void>;
}

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private db: Database) {}

  async createUser(email?: string): Promise<UserAccount> {
    try {
      const [inserted] = await this.db
        .insert(users)
        .values({
          email: email ?? null,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to create user record');
      }

      return {
        id: inserted.id,
        email: inserted.email,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      };
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new AppError('INVALID_INPUT', 'Email is already registered', 409);
      }
      throw err;
    }
  }

  async createProfile(
    userId: string,
    username: string,
    avatarUrl?: string,
  ): Promise<GamingProfile> {
    try {
      const [inserted] = await this.db
        .insert(gamingProfiles)
        .values({
          userId,
          username,
          avatarUrl: avatarUrl ?? null,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to create gaming profile record');
      }

      return {
        id: inserted.id,
        userId: inserted.userId,
        username: inserted.username,
        avatarUrl: inserted.avatarUrl,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      };
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new AppError('USERNAME_TAKEN', 'Username is already taken', 409);
      }
      throw err;
    }
  }

  async findUserById(userId: string): Promise<UserAccount | null> {
    const [found] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!found) return null;

    return {
      id: found.id,
      email: found.email,
      createdAt: found.createdAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    };
  }

  async findProfileByUserId(userId: string): Promise<GamingProfile | null> {
    const [found] = await this.db
      .select()
      .from(gamingProfiles)
      .where(eq(gamingProfiles.userId, userId))
      .limit(1);

    if (!found) return null;

    return {
      id: found.id,
      userId: found.userId,
      username: found.username,
      avatarUrl: found.avatarUrl,
      createdAt: found.createdAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    };
  }

  async findProfileById(profileId: string): Promise<GamingProfile | null> {
    const [found] = await this.db
      .select()
      .from(gamingProfiles)
      .where(eq(gamingProfiles.id, profileId))
      .limit(1);

    if (!found) return null;

    return {
      id: found.id,
      userId: found.userId,
      username: found.username,
      avatarUrl: found.avatarUrl,
      createdAt: found.createdAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    };
  }

  async findProfileByUsername(username: string): Promise<GamingProfile | null> {
    const [found] = await this.db
      .select()
      .from(gamingProfiles)
      .where(sql`lower(${gamingProfiles.username}) = lower(${username})`)
      .limit(1);

    if (!found) return null;

    return {
      id: found.id,
      userId: found.userId,
      username: found.username,
      avatarUrl: found.avatarUrl,
      createdAt: found.createdAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    };
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<SessionRecord> {
    const [inserted] = await this.db
      .insert(sessions)
      .values({
        userId,
        tokenHash,
        expiresAt,
      })
      .returning();

    if (!inserted) {
      throw new Error('Failed to create session record');
    }

    return {
      id: inserted.id,
      userId: inserted.userId,
      tokenHash: inserted.tokenHash,
      expiresAt: inserted.expiresAt,
      createdAt: inserted.createdAt,
    };
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const [found] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1);

    if (!found) return null;

    return {
      id: found.id,
      userId: found.userId,
      tokenHash: found.tokenHash,
      expiresAt: found.expiresAt,
      createdAt: found.createdAt,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }
}

export class InMemoryIdentityRepository implements IdentityRepository {
  private users = new Map<string, UserAccount>();
  private profilesByUserId = new Map<string, GamingProfile>();
  private profilesById = new Map<string, GamingProfile>();
  private sessionsByHash = new Map<string, SessionRecord>();

  async createUser(email?: string): Promise<UserAccount> {
    if (email) {
      for (const u of this.users.values()) {
        if (u.email?.toLowerCase() === email.toLowerCase()) {
          throw new AppError('INVALID_INPUT', 'Email is already registered', 409);
        }
      }
    }
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
    if (this.profilesByUserId.has(userId)) {
      throw new AppError('INVALID_INPUT', 'User already has a gaming profile', 409);
    }
    const existing = await this.findProfileByUsername(username);
    if (existing) {
      throw new AppError('USERNAME_TAKEN', 'Username is already taken', 409);
    }

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

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<SessionRecord> {
    const id = crypto.randomUUID();
    const session: SessionRecord = {
      id,
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    };
    this.sessionsByHash.set(tokenHash, session);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.sessionsByHash.get(tokenHash) ?? null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    for (const [hash, session] of this.sessionsByHash.entries()) {
      if (session.id === sessionId) {
        this.sessionsByHash.delete(hash);
        break;
      }
    }
  }
}

export class IdentityService {
  constructor(private repo: IdentityRepository = new InMemoryIdentityRepository()) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async registerUser(input: RegisterUserInput): Promise<RegisterResponse> {
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

    // Generate high-entropy bearer token and store SHA-256 hash
    const rawSessionToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.repo.createSession(user.id, tokenHash, expiresAt);

    return {
      user,
      profile,
      sessionToken: rawSessionToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async authenticate(sessionToken: string): Promise<AuthUserResponse> {
    if (!sessionToken || sessionToken.trim().length === 0) {
      throw new AppError('UNAUTHORIZED', 'Missing session token', 401);
    }

    const tokenHash = this.hashToken(sessionToken);
    const session = await this.repo.findSessionByTokenHash(tokenHash);

    if (!session) {
      throw new AppError('UNAUTHORIZED', 'Invalid session token', 401);
    }

    if (new Date(session.expiresAt) <= new Date()) {
      await this.repo.deleteSession(session.id);
      throw new AppError('UNAUTHORIZED', 'Session has expired', 401);
    }

    const user = await this.repo.findUserById(session.userId);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User account not found', 401);
    }

    const profile = await this.repo.findProfileByUserId(session.userId);
    if (!profile) {
      throw new AppError('UNAUTHORIZED', 'Gaming profile not found', 401);
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
