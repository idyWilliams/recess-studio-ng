import type { GameMetadata } from '@recess/game-core';

export const WHOT_GAME_ID = 'whot';

export const whotMeta: GameMetadata = {
  description:
    "Nigeria's iconic card duel: 54 cards, Circle, Triangle, Cross, Square, Star, Card 1 'Hold On', Card 2 'Pick Two', Card 14 'General Market', and Card 20 'Whot!'.",
  category: 'Card Game',
  tags: ['casual', 'pvp', 'turn-based', 'card-game', 'african-classics', 'naija'],
  turnDurationMs: 15_000,
};
