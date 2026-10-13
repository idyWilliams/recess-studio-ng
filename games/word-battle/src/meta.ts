/**
 * Word Battle — implemented 2-player word duel.
 * See docs/games/word-battle.md for the authoritative rules.
 */

export const WORD_BATTLE_GAME_ID = 'word-battle';

export const wordBattleMeta = {
  id: WORD_BATTLE_GAME_ID,
  name: 'Word Battle',
  minPlayers: 2,
  maxPlayers: 2,
  status: 'implemented' as const,
};
