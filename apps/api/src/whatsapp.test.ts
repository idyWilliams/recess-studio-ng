import { describe, expect, it, vi } from 'vitest';
import { GameRegistry } from './games/game-registry.js';
import {
  IdentityService,
  InMemoryIdentityRepository,
} from './identity/identity-service.js';
import {
  InMemorySessionRepository,
} from './sessions/session-repository.js';
import { SessionService } from './sessions/session-service.js';
import { WhatsAppGateway } from './whatsapp/whatsapp-gateway.js';

describe('WhatsAppGateway & Session Notifications', () => {
  it('reports correct gateway status and transports', () => {
    const gateway = new WhatsAppGateway({
      apiUrl: 'https://waha.example.com',
      apiKey: 'secret-key',
    });
    const status = gateway.getStatus();

    expect(status.configured).toBe(true);
    expect(status.primaryTransport).toBe('evolution_waha');
    expect(status.transports.evolutionOrWaha).toBe(true);
    expect(status.transports.inAppPush).toBe(true);
  });

  it('creates in-app notifications and falls back cleanly without crashing', async () => {
    const identityRepo = new InMemoryIdentityRepository();
    const identityService = new IdentityService(identityRepo);
    const gateway = new WhatsAppGateway({}, identityService);

    const result = await gateway.sendNotification({
      toUserId: 'player-target-1',
      type: 'turn',
      title: '⚔️ Your turn in Whot!',
      message: 'Opponent played Star 7',
      matchUrl: '/games/whot/test-123',
      gameTitle: 'Whot! Naija',
      fromUsername: 'Challenger',
      fromUserId: 'player-src-1',
      publicId: 'test-123',
    });

    expect(result.delivered).toBe(true);
    expect(result.transportsUsed).toContain('in_app_push');

    const notifs = identityService.getNotifications('player-target-1');
    expect(notifs.length).toBe(1);
    expect(notifs[0]?.message).toBe('Opponent played Star 7');
    expect(notifs[0]?.gameName).toBe('Whot! Naija');
  });

  it('automatically dispatches invite_accepted when a second player joins a match', async () => {
    const identityRepo = new InMemoryIdentityRepository();
    const identityService = new IdentityService(identityRepo);
    const sessionRepo = new InMemorySessionRepository();
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(sessionRepo, gameRegistry);
    const gateway = new WhatsAppGateway({}, identityService);

    const sendSpy = vi.spyOn(gateway, 'sendNotification');
    sessionService.setWhatsAppGateway(gateway);

    // Register host user and joiner user
    const hostUser = await identityRepo.createUser('host@test.com', '+2348011112222');
    await identityRepo.createProfile(hostUser.id, 'host_player');
    sessionRepo.setUsername(hostUser.id, 'host_player');

    const joinerUser = await identityRepo.createUser('joiner@test.com', '+2348033334444');
    await identityRepo.createProfile(joinerUser.id, 'joiner_player');
    sessionRepo.setUsername(joinerUser.id, 'joiner_player');

    // Host creates game session
    const session = await sessionService.createSession(hostUser.id, {
      gameId: 'whot',
    });

    // Joiner joins session
    await sessionService.joinSession(joinerUser.id, session.publicId);

    // Verify gateway was called with invite_accepted
    expect(sendSpy).toHaveBeenCalled();
    const matchingCall = sendSpy.mock.calls.find(
      (args) => args[0]?.type === 'invite_accepted',
    );
    expect(matchingCall).toBeDefined();
    expect(matchingCall![0]?.toUserId).toBe(hostUser.id);
    expect(matchingCall![0]?.fromUsername).toBe('joiner_player');
  });

  it('automatically dispatches turn notification to opponent upon move submission', async () => {
    const identityRepo = new InMemoryIdentityRepository();
    const identityService = new IdentityService(identityRepo);
    const sessionRepo = new InMemorySessionRepository();
    const gameRegistry = new GameRegistry();
    const sessionService = new SessionService(sessionRepo, gameRegistry);
    const gateway = new WhatsAppGateway({}, identityService);

    const sendSpy = vi.spyOn(gateway, 'sendNotification');
    sessionService.setWhatsAppGateway(gateway);

    const user1 = await identityRepo.createUser('u1@test.com');
    await identityRepo.createProfile(user1.id, 'player_one');
    const user2 = await identityRepo.createUser('u2@test.com');
    await identityRepo.createProfile(user2.id, 'player_two');

    const session = await sessionService.createSession(user1.id, { gameId: 'whot' });
    const joined = await sessionService.joinSession(user2.id, session.publicId);

    sendSpy.mockClear();

    // Player 1 submits move (draw from market)
    const activePlayerId = joined.currentPlayerId;
    const waitingPlayerId = activePlayerId === user1.id ? user2.id : user1.id;

    await sessionService.submitMove(activePlayerId!, session.publicId, {
      expectedStateVersion: joined.stateVersion,
      move: { type: 'draw' },
    });

    // Verify turn notification was dispatched to the waiting player
    const turnCall = sendSpy.mock.calls.find((args) => args[0]?.type === 'turn');
    expect(turnCall).toBeDefined();
    expect(turnCall![0]?.toUserId).toBe(waitingPlayerId);
  });
});
