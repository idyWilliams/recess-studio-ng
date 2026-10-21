import type { GameMetadata } from '@recess/game-core';

export const LUDO_GAME_ID = 'ludo';

export const ludoMeta: GameMetadata = {
  description:
    'The iconic 4-color board race: roll lucky 6s to leave the yard, navigate the 52-square track, capture opponent tokens, and race all 4 tokens to home.',
  category: 'BOARD',
  tags: ['casual', 'pvp', 'turn-based', 'board-game', 'dice', 'classic'],
  turnDurationMs: 30_000,
};
