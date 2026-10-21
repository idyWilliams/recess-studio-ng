import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  createDatabaseClient,
  gamingProfiles,
  sessions,
  users,
  type Database,
} from '@recess/database';

import { buildApp } from './app.js';
import {
  IdentityService,
  PostgresIdentityRepository,
} from './identity/identity-service.js';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://recess:recess@localhost:5432/recess_test';

describe('PostgreSQL Identity Integration & Persistence', () => {
  let db: Database;
  let closeClient: () => Promise<void>;
  let canConnect = false;

  beforeAll(async () => {
    try {
      const clientBundle = createDatabaseClient(TEST_DATABASE_URL);
      db = clientBundle.db;
      closeClient = async () => {
        await clientBundle.client.end();
      };
      // Simple probe query
      await db.select().from(users).limit(1);
      canConnect = true;
    } catch {
      canConnect = false;
    }
  });

  afterAll(async () => {
    if (closeClient) {
      await closeClient();
    }
  });

  it('verifies real PostgreSQL connection and schema migration state', () => {
    if (!canConnect) {
      if (process.env.CI === 'true' || process.env.REQUIRE_POSTGRES_TESTS === 'true') {
        expect(canConnect).toBe(true);
      }
      return;
    }
    expect(canConnect).toBe(true);
  });

  it('persists registered user, profile, and session to PostgreSQL', async () => {
    if (!canConnect) return;

    const env = {
      PORT: 3001,
      NODE_ENV: 'test' as const,
      DATABASE_URL: TEST_DATABASE_URL,
    };
    const app = buildApp(env, new IdentityService(new PostgresIdentityRepository(db)));

    const uniqueTag = Date.now().toString(36);
    const username = `pguser_${uniqueTag}`;
    const email = `pguser_${uniqueTag}@recess.gg`;

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        username,
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    });

    expect(registerRes.statusCode).toBe(201);
    const { user, profile, sessionToken } = registerRes.json();

    // Verify row directly in PostgreSQL users table
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
    expect(dbUser).toBeDefined();
    expect(dbUser?.email).toBe(email);

    // Verify row directly in PostgreSQL gaming_profiles table
    const [dbProfile] = await db
      .select()
      .from(gamingProfiles)
      .where(eq(gamingProfiles.id, profile.id));
    expect(dbProfile).toBeDefined();
    expect(dbProfile?.username).toBe(username);
    expect(dbProfile?.userId).toBe(user.id);

    // Verify row directly in PostgreSQL sessions table
    const dbSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user.id));
    expect(dbSessions.length).toBe(1);

    // VERIFY RESTART PERSISTENCE:
    // Close the current Fastify instance and construct a completely new app
    await app.close();

    const restartedApp = buildApp(
      env,
      new IdentityService(new PostgresIdentityRepository(db)),
    );

    const meRes = await restartedApp.inject({
      method: 'GET',
      url: '/me',
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = meRes.json();
    expect(meBody.user.id).toBe(user.id);
    expect(meBody.profile.username).toBe(username);

    await restartedApp.close();
  });

  it('enforces PostgreSQL case-insensitive unique username constraint', async () => {
    if (!canConnect) return;

    const uniqueTag = Date.now().toString(36);
    const username = `Hero_${uniqueTag}`;

    const repo = new PostgresIdentityRepository(db);
    const user1 = await repo.createUser();
    await repo.createProfile(user1.id, username);

    // Attempting to create a profile with lowercase variant of same username must fail
    const user2 = await repo.createUser();
    await expect(
      repo.createProfile(user2.id, username.toLowerCase()),
    ).rejects.toThrow();
  });

  it('enforces PostgreSQL cascade delete when user is deleted', async () => {
    if (!canConnect) return;

    const repo = new PostgresIdentityRepository(db);
    const user = await repo.createUser();
    const profile = await repo.createProfile(user.id, `del_${Date.now().toString(36)}`);
    await repo.createSession(
      user.id,
      `hash_${Date.now()}`,
      new Date(Date.now() + 60000),
    );

    // Delete user in PostgreSQL
    await db.delete(users).where(eq(users.id, user.id));

    // Verify gaming profile was cascaded by PostgreSQL foreign key
    const [foundProfile] = await db
      .select()
      .from(gamingProfiles)
      .where(eq(gamingProfiles.id, profile.id));
    expect(foundProfile).toBeUndefined();

    // Verify session was cascaded by PostgreSQL foreign key
    const foundSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user.id));
    expect(foundSessions.length).toBe(0);
  });
});
