import type { GameMetadata } from '@recess/game-core';

export const MANCALA_GAME_ID = 'mancala';

export const mancalaMeta: GameMetadata = {
  description:
    'Ancient strategy reborn: 14 pits, 48 seeds, counter-clockwise sowing, Kalah extra turns, and opposite-pit captures.',
  category: 'Strategy',
  tags: ['casual', 'pvp', 'turn-based', 'strategy', 'african-classics'],
  turnDurationMs: 15_000,
};
