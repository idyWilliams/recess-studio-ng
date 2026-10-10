/** Word Battle — first planned game. Gameplay is not implemented in Phase 0. */

export const WORD_BATTLE_GAME_ID = 'word-battle';

export const wordBattleMeta = {
  id: WORD_BATTLE_GAME_ID,
  name: 'Word Battle',
  minPlayers: 2,
  maxPlayers: 2,
  status: 'planned' as const,
};
