export { WORD_BATTLE_GAME_ID, wordBattleMeta } from './meta.js';
export {
  applyCascadeAndSpawn,
  evaluateMove,
  findPathOnBoard,
  generateBoardTiles,
  isAdjacent,
  mulberry32,
  validateBoardPath,
  wordBattleGame,
} from './word-battle.js';
export type {
  BoardCoordinate,
  BoardTile,
  BoardTransitionDelta,
  CascadedTileMovement,
  WordBattleMove,
  WordBattlePenaltyReason,
  WordBattleResult,
  WordBattleState,
  WordBattleTimeoutMove,
  WordBattleTurnHistory,
  WordBattleWordMove,
} from './types.js';
