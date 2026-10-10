import { describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import { IdentityService } from './identity/identity-service.js';

describe('Identity and Authentication routes', () => {
  const env = { PORT: 3000, NODE_ENV: 'test' as const };

  it('registers a user and returns valid bearer session token', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'player1@recess.gg',
        username: 'SpeedyGamer',
        avatarUrl: 'https://example.com/avatar1.png',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe('player1@recess.gg');
    expect(body.user.id).toBeDefined();
    expect(body.profile.username).toBe('SpeedyGamer');
    expect(body.profile.userId).toBe(body.user.id);
    expect(body.sessionToken).toBeDefined();
    expect(typeof body.sessionToken).toBe('string');
    expect(body.expiresAt).toBeDefined();
  });

  it('rejects registration when username already taken (case-insensitive)', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'AlphaPlayer',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'alphaplayer', // case variant
      },
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.code).toBe('USERNAME_TAKEN');
  });

  it('rejects registration with invalid username format', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'bad name with spaces!',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  it('rejects GET /me when authorization header is missing', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const res = await app.inject({
      method: 'GET',
      url: '/me',
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('never trusts client-supplied user ID on /me', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        'x-user-id': '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('authenticates GET /me using Bearer session token', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'auth@recess.gg',
        username: 'AuthPlayer',
      },
    });
    const { user, sessionToken } = regRes.json();

    const meRes = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = meRes.json();
    expect(meBody.user.id).toBe(user.id);
    expect(meBody.user.email).toBe('auth@recess.gg');
    expect(meBody.profile.username).toBe('AuthPlayer');
  });

  it('rejects forged or invalid bearer token on /me', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        authorization: 'Bearer forged-fake-session-token-12345',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('public gaming profile never leaks email or credentials', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'secret@private.com',
        username: 'PublicStar',
      },
    });
    const { profile } = regRes.json();

    const profileRes = await app.inject({
      method: 'GET',
      url: `/gaming-profiles/${profile.id}`,
    });

    expect(profileRes.statusCode).toBe(200);
    const pubBody = profileRes.json();
    expect(pubBody.id).toBe(profile.id);
    expect(pubBody.username).toBe('PublicStar');
    expect(pubBody.email).toBeUndefined();
    expect(pubBody.sessionToken).toBeUndefined();
  });
});
