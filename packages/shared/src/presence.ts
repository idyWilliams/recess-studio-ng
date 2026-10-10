/** Conceptual presence model — not implemented in Phase 0. */

export type PlayerPresenceStatus = 'online' | 'in_game' | 'offline';

export interface PlayerPresence {
  userId: string;
  status: PlayerPresenceStatus;
  currentGameId?: string;
  lastSeenAt: Date;
}
