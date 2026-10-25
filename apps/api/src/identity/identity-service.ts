import crypto from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';

import {
  externalIdentities,
  gamingProfiles,
  sessions,
  users,
  type Database,
} from '@recess/database';
import {
  maskWhatsAppNumber,
  normalizeWhatsAppNumber,
  registerUserSchema,
  type AuthUserResponse,
  type GamingProfile,
  type LivePlayerStatsResponse,
  type PublicPlayerProfile,
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
  createUser(email?: string, whatsappNumber?: string): Promise<UserAccount>;
  createProfile(
    userId: string,
    username: string,
    avatarUrl?: string,
    displayName?: string,
    avatarId?: string,
    countryFlag?: string,
  ): Promise<GamingProfile>;
  findUserById(userId: string): Promise<UserAccount | null>;
  findUserByWhatsApp(whatsappNumber: string): Promise<UserAccount | null>;
  linkWhatsApp(userId: string, whatsappNumber: string): Promise<void>;
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
  recordHeartbeat(userId: string): Promise<void>;
  listRecentProfiles(limit?: number): Promise<GamingProfile[]>;
  countRegisteredUsers(): Promise<number>;
  countActiveUsers(windowMinutes?: number): Promise<number>;
}

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private db: Database) {}

  async createUser(email?: string, whatsappNumber?: string): Promise<UserAccount> {
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

      if (whatsappNumber) {
        await this.linkWhatsApp(inserted.id, whatsappNumber);
      }

      return {
        id: inserted.id,
        email: inserted.email,
        whatsappNumber: whatsappNumber ?? null,
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
        throw new AppError('INVALID_INPUT', 'Email or WhatsApp number is already registered', 409);
      }
      throw err;
    }
  }

  async linkWhatsApp(userId: string, whatsappNumber: string): Promise<void> {
    await this.db
      .insert(externalIdentities)
      .values({
        userId,
        provider: 'whatsapp',
        externalSubjectId: whatsappNumber,
      })
      .onConflictDoNothing();
  }

  async findUserByWhatsApp(whatsappNumber: string): Promise<UserAccount | null> {
    const [found] = await this.db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(externalIdentities)
      .innerJoin(users, eq(users.id, externalIdentities.userId))
      .where(
        and(
          eq(externalIdentities.provider, 'whatsapp'),
          eq(externalIdentities.externalSubjectId, whatsappNumber),
        ),
      )
      .limit(1);

    if (!found) return null;

    return {
      id: found.id,
      email: found.email,
      whatsappNumber,
      createdAt: found.createdAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    };
  }

  async createProfile(
    userId: string,
    username: string,
    avatarUrl?: string,
    displayName?: string,
    avatarId?: string,
    countryFlag?: string,
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
        displayName: displayName ?? inserted.username,
        avatarId: avatarId ?? null,
        countryFlag: countryFlag ?? '🇳🇬',
        avatarUrl: inserted.avatarUrl,
        elo: 1420,
        isOnline: true,
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

    // Check if user has linked WhatsApp
    const [ext] = await this.db
      .select()
      .from(externalIdentities)
      .where(
        and(
          eq(externalIdentities.userId, userId),
          eq(externalIdentities.provider, 'whatsapp'),
        ),
      )
      .limit(1);

    return {
      id: found.id,
      email: found.email,
      whatsappNumber: ext?.externalSubjectId ?? null,
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
      elo: 1420,
      isOnline: true,
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
      elo: 1420,
      isOnline: true,
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
      elo: 1420,
      isOnline: true,
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

  async recordHeartbeat(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async listRecentProfiles(limit = 15): Promise<GamingProfile[]> {
    const rows = await this.db
      .select()
      .from(gamingProfiles)
      .orderBy(sql`${gamingProfiles.updatedAt} DESC`)
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.username,
      avatarUrl: r.avatarUrl,
      elo: 1420,
      isOnline: true,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async countRegisteredUsers(): Promise<number> {
    const [res] = await this.db.select({ count: sql<number>`count(*)::int` }).from(users);
    return res?.count ?? 0;
  }

  async countActiveUsers(windowMinutes = 15): Promise<number> {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    const [res] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.updatedAt} >= ${cutoff}`);
    return res?.count ?? 0;
  }
}

export class InMemoryIdentityRepository implements IdentityRepository {
  private users = new Map<string, UserAccount>();
  private usersByWhatsApp = new Map<string, string>(); // normalized phone -> userId
  private profilesByUserId = new Map<string, GamingProfile>();
  private profilesById = new Map<string, GamingProfile>();
  private sessionsByHash = new Map<string, SessionRecord>();
  private lastActiveMap = new Map<string, Date>(); // userId -> lastActive Date

  async createUser(email?: string, whatsappNumber?: string): Promise<UserAccount> {
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
      whatsappNumber: whatsappNumber ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    if (whatsappNumber) {
      this.usersByWhatsApp.set(whatsappNumber, id);
    }
    this.lastActiveMap.set(id, new Date());
    return user;
  }

  async linkWhatsApp(userId: string, whatsappNumber: string): Promise<void> {
    this.usersByWhatsApp.set(whatsappNumber, userId);
    const user = this.users.get(userId);
    if (user) {
      user.whatsappNumber = whatsappNumber;
    }
  }

  async findUserByWhatsApp(whatsappNumber: string): Promise<UserAccount | null> {
    const userId = this.usersByWhatsApp.get(whatsappNumber);
    if (!userId) return null;
    return this.findUserById(userId);
  }

  async createProfile(
    userId: string,
    username: string,
    avatarUrl?: string,
    displayName?: string,
    avatarId?: string,
    countryFlag?: string,
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
      displayName: displayName ?? username,
      avatarId: avatarId ?? null,
      countryFlag: countryFlag ?? '🇳🇬',
      avatarUrl: avatarUrl ?? null,
      elo: 1420,
      isOnline: true,
      lastActiveAt: now,
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

  async recordHeartbeat(userId: string): Promise<void> {
    this.lastActiveMap.set(userId, new Date());
    const profile = this.profilesByUserId.get(userId);
    if (profile) {
      profile.lastActiveAt = new Date().toISOString();
      profile.isOnline = true;
    }
  }

  async listRecentProfiles(limit = 15): Promise<GamingProfile[]> {
    const list = Array.from(this.profilesByUserId.values()).reverse();
    return list.slice(0, limit);
  }

  async countRegisteredUsers(): Promise<number> {
    return this.users.size;
  }

  async countActiveUsers(windowMinutes = 15): Promise<number> {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    let count = 0;
    for (const date of this.lastActiveMap.values()) {
      if (date.getTime() >= cutoff) {
        count++;
      }
    }
    return count;
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

    const normalizedWa = input.whatsappNumber
      ? normalizeWhatsAppNumber(input.whatsappNumber)
      : null;

    // 1. WhatsApp Account Restore: If a player with this WhatsApp number already exists,
    // restore their exact account & profile across browser / Home Screen PWA!
    if (normalizedWa) {
      const existingUser = await this.repo.findUserByWhatsApp(normalizedWa);
      if (existingUser) {
        const existingProfile = await this.repo.findProfileByUserId(existingUser.id);
        if (existingProfile) {
          const rawSessionToken = crypto.randomBytes(32).toString('base64url');
          const tokenHash = this.hashToken(rawSessionToken);
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await this.repo.createSession(existingUser.id, tokenHash, expiresAt);
          await this.repo.recordHeartbeat(existingUser.id);

          return {
            user: existingUser,
            profile: {
              ...existingProfile,
              maskedWhatsApp: maskWhatsAppNumber(normalizedWa),
              whatsappVerified: true,
            },
            sessionToken: rawSessionToken,
            expiresAt: expiresAt.toISOString(),
          };
        }
      }
    }

    // 2. Check if username is already taken by another player
    const existingProfile = await this.repo.findProfileByUsername(input.username);
    if (existingProfile) {
      throw new AppError('USERNAME_TAKEN', 'Username is already taken', 409);
    }

    // 3. Create fresh user & gaming profile
    const user = await this.repo.createUser(input.email, normalizedWa ?? undefined);
    const profile = await this.repo.createProfile(
      user.id,
      input.username,
      input.avatarUrl,
      input.displayName,
      input.avatarId,
      input.countryFlag,
    );

    // Generate high-entropy bearer token and store SHA-256 hash
    const rawSessionToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.repo.createSession(user.id, tokenHash, expiresAt);
    await this.repo.recordHeartbeat(user.id);

    return {
      user,
      profile: {
        ...profile,
        maskedWhatsApp: normalizedWa ? maskWhatsAppNumber(normalizedWa) : null,
        whatsappVerified: Boolean(normalizedWa),
      },
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

    await this.repo.recordHeartbeat(session.userId);

    return {
      user,
      profile: {
        ...profile,
        maskedWhatsApp: user.whatsappNumber
          ? maskWhatsAppNumber(user.whatsappNumber)
          : null,
        whatsappVerified: Boolean(user.whatsappNumber),
      },
    };
  }

  async recordHeartbeat(userId: string): Promise<void> {
    await this.repo.recordHeartbeat(userId);
  }

  async getPublicGamingProfile(profileId: string): Promise<GamingProfile> {
    const profile = await this.repo.findProfileById(profileId);
    if (!profile) {
      throw new AppError('GAME_NOT_FOUND', 'Gaming profile not found', 404);
    }
    // Strictly sanitize: never expose phone number or private data
    return {
      id: profile.id,
      userId: profile.userId,
      username: profile.username,
      displayName: profile.displayName ?? profile.username,
      avatarId: profile.avatarId ?? null,
      countryFlag: profile.countryFlag ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      elo: profile.elo ?? 1420,
      isOnline: profile.isOnline ?? true,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async getLiveStats(): Promise<LivePlayerStatsResponse> {
    const registeredCount = await this.repo.countRegisteredUsers();
    const activeCount = await this.repo.countActiveUsers(15);
    const profiles = await this.repo.listRecentProfiles(15);

    const seedPlayers: PublicPlayerProfile[] = [
      {
        id: 'p-seed-1',
        username: 'Grandmaster',
        displayName: 'Chidi Master',
        avatarId: 'avatar-chidi',
        countryFlag: '🇳🇬',
        avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
        elo: 1840,
        isOnline: true,
        lastActiveAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        id: 'p-seed-2',
        username: 'tunde',
        displayName: 'Tunde Adebayo',
        avatarId: 'avatar-tunde',
        countryFlag: '🇳🇬',
        avatarUrl: '/assets/shared/avatars/avatar-tunde.svg',
        elo: 1690,
        isOnline: true,
        lastActiveAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'p-seed-3',
        username: 'amina',
        displayName: 'Amina Mensah',
        avatarId: 'avatar-amina',
        countryFlag: '🇬🇭',
        avatarUrl: '/assets/shared/avatars/avatar-amina.svg',
        elo: 1610,
        isOnline: true,
        lastActiveAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      },
      {
        id: 'p-seed-4',
        username: 'efe',
        displayName: 'Efe Omowale',
        avatarId: 'avatar-efe',
        countryFlag: '🇳🇬',
        avatarUrl: '/assets/shared/avatars/avatar-efe.svg',
        elo: 1570,
        isOnline: false,
        lastActiveAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
    ];

    const mappedRealPlayers: PublicPlayerProfile[] = profiles.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName ?? p.username,
      avatarId: p.avatarId ?? 'avatar-chidi',
      countryFlag: p.countryFlag ?? '🇳🇬',
      avatarUrl: p.avatarUrl ?? '/assets/shared/avatars/avatar-chidi.svg',
      elo: p.elo ?? 1420,
      isOnline: p.isOnline ?? true,
      lastActiveAt: p.lastActiveAt ?? p.updatedAt,
    }));

    const realUsernames = new Set(mappedRealPlayers.map((p) => p.username.toLowerCase()));
    const combinedRecent = [
      ...mappedRealPlayers,
      ...seedPlayers.filter((s) => !realUsernames.has(s.username.toLowerCase())),
    ];

    return {
      totalRegisteredPlayers: Math.max(combinedRecent.length, registeredCount + 4),
      onlineNowCount: Math.max(3, activeCount + 3),
      activeMatchesCount: Math.max(2, Math.floor(activeCount / 2) + 2),
      perGameCounts: {
        'word-battle': 12,
        'mancala': 8,
        'whot': 15,
        'ludo': 10,
      },
      recentPlayers: combinedRecent.slice(0, 15),
    };
  }
}

