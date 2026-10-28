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

  it('WhatsApp privacy vault: masks phone on owner response and NEVER leaks phone to public directory', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const regRes = await app.inject({
      method: 'POST',
      url: '/players/register',
      payload: {
        username: 'PrivateGamer',
        whatsappNumber: '+2348099887766',
        displayName: 'Private Player',
      },
    });

    expect(regRes.statusCode).toBe(200);
    const regBody = regRes.json();
    // Owner sees masked WhatsApp format
    expect(regBody.profile.maskedWhatsApp).toBe('+234 ••• ••66');
    expect(regBody.profile.whatsappVerified).toBe(true);

    // Public directory lookup strictly conceals the phone
    const profileRes = await app.inject({
      method: 'GET',
      url: `/gaming-profiles/${regBody.profile.id}`,
    });
    expect(profileRes.statusCode).toBe(200);
    const pubBody = profileRes.json();
    expect(pubBody.username).toBe('PrivateGamer');
    expect(pubBody.whatsappNumber).toBeUndefined();
    expect(pubBody.maskedWhatsApp).toBeUndefined();

    // Live stats directory also never leaks any raw phone numbers
    const statsRes = await app.inject({
      method: 'GET',
      url: '/players/live-stats',
    });
    expect(statsRes.statusCode).toBe(200);
    const stats = statsRes.json();
    expect(stats.totalRegisteredPlayers).toBeGreaterThanOrEqual(1);
    expect(stats.onlineNowCount).toBeGreaterThanOrEqual(1);
    for (const player of stats.recentPlayers) {
      expect(player.whatsappNumber).toBeUndefined();
      expect(player.phone).toBeUndefined();
    }
  });

  it('Cross-Context Restore: Entering existing WhatsApp number restores existing account and session', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    // First visit: register on browser
    const firstReg = await app.inject({
      method: 'POST',
      url: '/players/register',
      payload: {
        username: 'PwaSyncPlayer',
        whatsappNumber: '+2348123456789',
        displayName: 'Sync Legend',
      },
    });
    expect(firstReg.statusCode).toBe(200);
    const firstBody = firstReg.json();
    const originalUserId = firstBody.user.id;
    const originalProfileId = firstBody.profile.id;

    // Second visit on Home Screen PWA (different session, but same WhatsApp number):
    const secondReg = await app.inject({
      method: 'POST',
      url: '/players/register',
      payload: {
        username: 'PwaSyncPlayer',
        whatsappNumber: '+2348123456789',
      },
    });
    expect(secondReg.statusCode).toBe(200);
    const secondBody = secondReg.json();

    // Verifies account restore: returns the same user and profile ID!
    expect(secondBody.user.id).toBe(originalUserId);
    expect(secondBody.profile.id).toBe(originalProfileId);
    expect(secondBody.profile.username).toBe('PwaSyncPlayer');
    expect(secondBody.profile.maskedWhatsApp).toBe('+234 ••• ••89');
    expect(secondBody.sessionToken).toBeDefined();
  });

  it('live-stats starts with 0 perGameCounts, 0 activeMatches, and ZERO dummy seed players', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    const statsRes = await app.inject({
      method: 'GET',
      url: '/players/live-stats',
    });
    expect(statsRes.statusCode).toBe(200);
    const stats = statsRes.json();

    // Verify 0 dummy seed accounts
    expect(stats.recentPlayers).toEqual([]);
    expect(stats.totalRegisteredPlayers).toBe(0);
    expect(stats.onlineNowCount).toBe(0);
    expect(stats.activeMatchesCount).toBe(0);
    expect(stats.perGameCounts).toEqual({
      'word-battle': 0,
      'mancala': 0,
      'whot': 0,
      'ludo': 0,
    });

    // Make sure fake seed players are nowhere in the output
    const usernames = stats.recentPlayers.map((p: any) => p.username.toLowerCase());
    expect(usernames).not.toContain('grandmaster');
    expect(usernames).not.toContain('tunde');
    expect(usernames).not.toContain('amina');
    expect(usernames).not.toContain('efe');
  });

  it('POST /players/challenge creates a match session and adds an alert to target player inbox', async () => {
    const identityService = new IdentityService();
    const app = buildApp(env, identityService);

    // Register challenger
    const chalReg = await app.inject({
      method: 'POST',
      url: '/players/register',
      payload: {
        username: 'Challenger1',
        whatsappNumber: '+2348011112222',
      },
    });
    const challenger = chalReg.json();

    // Register target
    const targetReg = await app.inject({
      method: 'POST',
      url: '/players/register',
      payload: {
        username: 'TargetRival',
        whatsappNumber: '+2348033334444',
      },
    });
    const target = targetReg.json();

    // Challenge target to Whot!
    const challengeRes = await app.inject({
      method: 'POST',
      url: '/players/challenge',
      payload: {
        challengerId: challenger.user.id,
        challengerUsername: 'Challenger1',
        targetPlayerId: target.profile.id,
        targetUsername: 'TargetRival',
        gameType: 'whot',
      },
    });
    expect(challengeRes.statusCode).toBe(200);
    const challengeBody = challengeRes.json();
    expect(challengeBody.publicId).toBeDefined();
    expect(challengeBody.matchUrl).toContain('/games/whot/');
    expect(challengeBody.notificationId).toBeDefined();
    expect(challengeBody.whatsappDirectUrl).toContain('whatsapp://send?phone=2348033334444');

    // Verify target receives the challenge notification in inbox
    const notifRes = await app.inject({
      method: 'GET',
      url: `/players/notifications?userId=${target.user.id}`,
    });
    expect(notifRes.statusCode).toBe(200);
    const notifications = notifRes.json();
    expect(notifications.length).toBe(1);
    expect(notifications[0].challengerUsername).toBe('Challenger1');
    expect(notifications[0].gameType).toBe('whot');
    expect(notifications[0].matchUrl).toBe(challengeBody.matchUrl);

    // Dismiss notification
    const dismissRes = await app.inject({
      method: 'POST',
      url: `/players/notifications/${challengeBody.notificationId}/dismiss`,
    });
    expect(dismissRes.statusCode).toBe(200);

    const clearedRes = await app.inject({
      method: 'GET',
      url: `/players/notifications?userId=${target.user.id}`,
    });
    expect(clearedRes.json().length).toBe(0);
  });
});
