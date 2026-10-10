import { describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import { IdentityService } from './identity/identity-service.js';

describe('Identity routes', () => {
  const env = { PORT: 3000, NODE_ENV: 'test' as const };

  it('registers a user account and gaming profile', async () => {
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
  });

  it('rejects registration when username is already taken', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'TakenName',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'TakenName',
      },
    });

    expect(res.statusCode).toBe(409);
  });

  it('fetches authenticated user details via /me', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'AuthPlayer',
      },
    });
    const { user } = regRes.json();

    const meRes = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        'x-user-id': user.id,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = meRes.json();
    expect(meBody.user.id).toBe(user.id);
    expect(meBody.profile.username).toBe('AuthPlayer');
  });

  it('fetches public gaming profile without leaking user private info', async () => {
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
  });
});
