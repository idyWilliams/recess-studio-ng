import type {
  GameDefinition,
  GamePlayer,
  GameValidationResult,
} from '@recess/game-core';

import type {
  BoardCoordinate,
  BoardTile,
  BoardTransitionDelta,
  CascadedTileMovement,
  WordBattleMove,
  WordBattlePenaltyReason,
  WordBattleResult,
  WordBattleState,
  WordBattleTurnHistory,
} from './types.js';

/** Default rounds: 5 rounds × 2 players = 10 total turns. */
const DEFAULT_MAX_ROUNDS = 5;
const STARTING_LIVES = 3;
const BOARD_SIZE = 4;
const MIN_WORD_LENGTH = 3;

// English letter frequency weights calibrated for 4×4 word grids
const LETTER_WEIGHTS: Record<string, number> = {
  A: 9, B: 2, C: 3, D: 4, E: 12, F: 2, G: 3, H: 4, I: 8,
  J: 1, K: 1, L: 5, M: 3, N: 6, O: 8, P: 3, Q: 1, R: 6,
  S: 6, T: 8, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const VOWEL_LIST = ['A', 'E', 'I', 'O', 'U'];
const CONSONANT_LIST = [
  'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
  'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z',
];

// Pre-computed weighted bag
const WEIGHTED_LETTER_BAG: string[] = [];
for (const [letter, weight] of Object.entries(LETTER_WEIGHTS)) {
  for (let i = 0; i < weight; i++) {
    WEIGHTED_LETTER_BAG.push(letter);
  }
}

/**
 * Pure, deterministic Mulberry32 PRNG.
 * Given a seed and step counter, produces a float in [0, 1).
 */
export function mulberry32(seed: number, step: number): number {
  let s = (seed + step * 0x6d2b79f5) >>> 0;
  s = (s + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Pick a weighted letter deterministically. */
function pickWeightedLetter(seed: number, step: number): string {
  const rand = mulberry32(seed, step);
  const index = Math.floor(rand * WEIGHTED_LETTER_BAG.length);
  return WEIGHTED_LETTER_BAG[index] ?? 'E';
}

/**
 * Ensure vowel count in the 16 tiles is between 4 and 7.
 */
function balanceVowels(
  letters: string[],
  seed: number,
  nextStep: () => number,
): void {
  let vowelCount = letters.filter((l) => VOWELS.has(l)).length;

  while (vowelCount < 4) {
    const nonVowelIdx = letters.findIndex((l) => !VOWELS.has(l));
    if (nonVowelIdx === -1) break;
    const vRand = mulberry32(seed, nextStep());
    letters[nonVowelIdx] = VOWEL_LIST[Math.floor(vRand * VOWEL_LIST.length)] ?? 'E';
    vowelCount++;
  }

  while (vowelCount > 7) {
    const vowelIdx = letters.findIndex((l) => VOWELS.has(l));
    if (vowelIdx === -1) break;
    const cRand = mulberry32(seed, nextStep());
    letters[vowelIdx] = CONSONANT_LIST[Math.floor(cRand * CONSONANT_LIST.length)] ?? 'T';
    vowelCount--;
  }
}

/** Generate a fresh 4×4 board deterministically. */
export function generateBoardTiles(
  seed: number,
  startStep: number,
  version: number,
): { board: BoardTile[][]; nextStep: number } {
  let step = startStep;
  const letters: string[] = [];
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    letters.push(pickWeightedLetter(seed, step++));
  }
  balanceVowels(letters, seed, () => step++);

  const board: BoardTile[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: BoardTile[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const idx = r * BOARD_SIZE + c;
      row.push({
        id: `t_r${r}_c${c}_v${version}`,
        letter: letters[idx]!,
        row: r,
        col: c,
      });
    }
    board.push(row);
  }
  return { board, nextStep: step };
}

/** Check if two board coordinates are horizontally, vertically, or diagonally adjacent. */
export function isAdjacent(c1: BoardCoordinate, c2: BoardCoordinate): boolean {
  const dr = Math.abs(c1.row - c2.row);
  const dc = Math.abs(c1.col - c2.col);
  return Math.max(dr, dc) === 1;
}

/**
 * Validate a path against the current board.
 * Checks:
 * - Coordinates are within [0..3]
 * - Path length matches word length
 * - No tile reuse
 * - Sequential adjacency
 * - Board letters match word characters
 */
export function validateBoardPath(
  board: BoardTile[][],
  normalizedWord: string,
  path: BoardCoordinate[],
): { valid: boolean; reason?: WordBattlePenaltyReason | undefined; message?: string | undefined } {
  if (path.length !== normalizedWord.length) {
    return {
      valid: false,
      reason: 'ILLEGAL_PATH',
      message: 'Path length does not match word length',
    };
  }

  if (path.length < MIN_WORD_LENGTH) {
    return {
      valid: false,
      reason: 'TOO_SHORT',
      message: `Word must contain at least ${MIN_WORD_LENGTH} letters`,
    };
  }

  const visited = new Set<string>();

  for (let i = 0; i < path.length; i++) {
    const coord = path[i]!;
    if (coord.row < 0 || coord.row >= BOARD_SIZE || coord.col < 0 || coord.col >= BOARD_SIZE) {
      return {
        valid: false,
        reason: 'ILLEGAL_PATH',
        message: 'Coordinate out of board bounds',
      };
    }

    const key = `${coord.row},${coord.col}`;
    if (visited.has(key)) {
      return {
        valid: false,
        reason: 'ILLEGAL_PATH',
        message: 'A tile cannot be used more than once within the same word',
      };
    }
    visited.add(key);

    if (i > 0) {
      const prev = path[i - 1]!;
      if (!isAdjacent(prev, coord)) {
        return {
          valid: false,
          reason: 'ILLEGAL_PATH',
          message: 'Tiles in path must be horizontally, vertically, or diagonally adjacent',
        };
      }
    }

    const tile = board[coord.row]?.[coord.col];
    if (!tile || tile.letter.toLowerCase() !== normalizedWord[i]) {
      return {
        valid: false,
        reason: 'ILLEGAL_PATH',
        message: `Board tile at (${coord.row}, ${coord.col}) does not match letter '${normalizedWord[i]}'`,
      };
    }
  }

  return { valid: true };
}

/**
 * Find a valid adjacent path on the board for a word via a bounded, deterministic
 * depth-first search. Used to resolve a word move when the client omits the path;
 * returns `null` when the word cannot be formed from the current board.
 * Search is bounded by the 4x4 grid and the visited-set pruning, so it never
 * degenerates into an unbounded solver.
 */
export function findPathOnBoard(
  board: BoardTile[][],
  normalizedWord: string,
): BoardCoordinate[] | null {
  const target = normalizedWord.toUpperCase();
  if (target.length === 0) return null;

  function dfs(
    row: number,
    col: number,
    idx: number,
    visited: Set<string>,
    currentPath: BoardCoordinate[],
  ): BoardCoordinate[] | null {
    if (idx === target.length) return currentPath;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;

        const tile = board[nr]?.[nc];
        if (tile && tile.letter === target[idx]) {
          visited.add(key);
          currentPath.push({ row: nr, col: nc });
          const res = dfs(nr, nc, idx + 1, visited, currentPath);
          if (res) return res;
          currentPath.pop();
          visited.delete(key);
        }
      }
    }
    return null;
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]?.[c]?.letter === target[0]) {
        const visited = new Set<string>([`${r},${c}`]);
        const path: BoardCoordinate[] = [{ row: r, col: c }];
        const result = dfs(r, c, 1, visited, path);
        if (result) return result;
      }
    }
  }
  return null;
}

/**
 * Remove consumed tiles, apply column gravity downward, and spawn replacement tiles.
 */
export function applyCascadeAndSpawn(
  board: BoardTile[][],
  path: BoardCoordinate[],
  newVersion: number,
  seed: number,
  startStep: number,
): { newBoard: BoardTile[][]; delta: BoardTransitionDelta; nextStep: number } {
  let step = startStep;
  const consumedSet = new Set(path.map((p) => `${p.row},${p.col}`));
  const consumedTileIds: string[] = [];

  for (const p of path) {
    const tile = board[p.row]?.[p.col];
    if (tile) consumedTileIds.push(tile.id);
  }

  const cascadedTiles: CascadedTileMovement[] = [];
  const spawnedTiles: BoardTile[] = [];

  // Build new columns
  const newCols: BoardTile[][] = [];

  for (let c = 0; c < BOARD_SIZE; c++) {
    // 1. Collect surviving tiles in this column from bottom up
    const surviving: BoardTile[] = [];
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (!consumedSet.has(`${r},${c}`)) {
        const tile = board[r]?.[c];
        if (tile) surviving.push(tile);
      }
    }

    const colTiles: BoardTile[] = new Array(BOARD_SIZE);

    // 2. Place surviving tiles from bottom row (BOARD_SIZE - 1) upwards
    for (let i = 0; i < surviving.length; i++) {
      const targetRow = BOARD_SIZE - 1 - i;
      const tile = surviving[i]!;
      if (tile.row !== targetRow) {
        cascadedTiles.push({
          tileId: tile.id,
          fromRow: tile.row,
          toRow: targetRow,
          col: c,
        });
      }
      colTiles[targetRow] = {
        ...tile,
        row: targetRow,
      };
    }

    // 3. Spawn replacement tiles for empty top slots
    const emptyCount = BOARD_SIZE - surviving.length;
    for (let r = emptyCount - 1; r >= 0; r--) {
      const letter = pickWeightedLetter(seed, step++);
      const newTile: BoardTile = {
        id: `t_r${r}_c${c}_v${newVersion}`,
        letter,
        row: r,
        col: c,
      };
      spawnedTiles.push(newTile);
      colTiles[r] = newTile;
    }

    newCols.push(colTiles);
  }

  // Construct 2D row-indexed board
  const newBoard: BoardTile[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: BoardTile[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(newCols[c]![r]!);
    }
    newBoard.push(row);
  }

  return {
    newBoard,
    delta: {
      consumedTileIds,
      cascadedTiles,
      spawnedTiles,
    },
    nextStep: step,
  };
}

export interface MoveEvaluation {
  isAccepted: boolean;
  score: number;
  normalizedWord: string;
  resolvedPath?: BoardCoordinate[] | undefined;
  penaltyReason?: WordBattlePenaltyReason | undefined;
  message?: string | undefined;
}

/** Evaluate whether a move is accepted or incurs a life-loss penalty. */
export function evaluateMove(
  state: WordBattleState,
  move: WordBattleMove,
): MoveEvaluation {
  // Timeout move
  if ('type' in move && move.type === 'timeout') {
    return {
      isAccepted: false,
      score: 0,
      normalizedWord: '',
      penaltyReason: 'TIMEOUT',
      message: 'Turn deadline expired',
    };
  }

  const wordMove = move as {
    word?: unknown;
    path?: BoardCoordinate[];
    isDictionaryValid?: boolean;
  };

  const rawWord = typeof wordMove.word === 'string' ? wordMove.word.trim() : '';
  const normalized = rawWord.toLowerCase();

  // Length check: min 3 letters
  if (normalized.length < MIN_WORD_LENGTH || !/^[a-z]+$/.test(normalized)) {
    return {
      isAccepted: false,
      score: 0,
      normalizedWord: normalized,
      penaltyReason: 'TOO_SHORT',
      message: `Word must contain at least ${MIN_WORD_LENGTH} alphabetic letters`,
    };
  }

  // Match-wide duplicate check
  if (state.usedWords.includes(normalized)) {
    return {
      isAccepted: false,
      score: 0,
      normalizedWord: normalized,
      penaltyReason: 'DUPLICATE_WORD',
      message: `"${rawWord}" was already accepted in this match`,
    };
  }

  // Dictionary validity check (if pre-validated by API)
  if (wordMove.isDictionaryValid === false) {
    return {
      isAccepted: false,
      score: 0,
      normalizedWord: normalized,
      penaltyReason: 'INVALID_DICTIONARY',
      message: `"${rawWord}" is not recognized in the dictionary`,
    };
  }

  // Path validation
  if (Array.isArray(wordMove.path) && wordMove.path.length > 0) {
    const pathVal = validateBoardPath(state.board, normalized, wordMove.path);
    if (!pathVal.valid) {
      return {
        isAccepted: false,
        score: 0,
        normalizedWord: normalized,
        penaltyReason: pathVal.reason ?? 'ILLEGAL_PATH',
        message: pathVal.message ?? 'Illegal path on the board',
      };
    }
    return {
      isAccepted: true,
      score: normalized.length,
      normalizedWord: normalized,
      resolvedPath: wordMove.path,
    };
  }

  // Path omitted (or empty): resolve it with a bounded, deterministic DFS over the
  // current board. A word is only accepted when it is demonstrably formable from the
  // actual board via legal, adjacent, non-repeating tile coordinates.
  const foundPath = findPathOnBoard(state.board, normalized);
  if (foundPath) {
    return {
      isAccepted: true,
      score: normalized.length,
      normalizedWord: normalized,
      resolvedPath: foundPath,
    };
  }

  // The word cannot be formed on the current board. Apply the ILLEGAL_PATH penalty:
  // no points, no tile consumption, 1 life lost, and the turn passes.
  return {
    isAccepted: false,
    score: 0,
    normalizedWord: normalized,
    penaltyReason: 'ILLEGAL_PATH',
    message: `No continuous path for "${rawWord}" exists on the board`,
  };
}

export interface InitialStateOptions {
  seed?: number | undefined;
}

export interface WordBattleGame
  extends GameDefinition<WordBattleState, WordBattleMove, WordBattleResult> {
  createInitialState(
    players: GamePlayer[],
    options?: InitialStateOptions,
  ): WordBattleState;
}

export const wordBattleGame: WordBattleGame = {
  id: 'word-battle',
  name: 'Word Battle',
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(
    players: GamePlayer[],
    options?: InitialStateOptions,
  ): WordBattleState {
    if (players.length !== 2) {
      throw new Error('Word Battle requires exactly 2 players');
    }
    const [p1, p2] = players;
    if (!p1 || !p2) {
      throw new Error('Invalid players');
    }

    const rngSeed = options?.seed ?? (Date.now() & 0x7fffffff);
    const { board, nextStep } = generateBoardTiles(rngSeed, 0, 0);

    return {
      players,
      currentPlayerId: p1.id,
      scores: { [p1.id]: 0, [p2.id]: 0 },
      lives: { [p1.id]: STARTING_LIVES, [p2.id]: STARTING_LIVES },
      turnCount: 0,
      totalTurns: DEFAULT_MAX_ROUNDS * players.length,
      board,
      boardVersion: 0,
      usedWords: [],
      history: [],
      rngSeed,
      rngStep: nextStep,
    };
  },

  validateMove(
    state: WordBattleState,
    move: WordBattleMove,
    playerId: string,
  ): GameValidationResult {
    if (this.isGameOver(state)) {
      return {
        ok: false,
        reason: 'GAME_OVER',
        message: 'The game is already over',
      };
    }

    if (state.currentPlayerId !== playerId) {
      return {
        ok: false,
        reason: 'NOT_YOUR_TURN',
        message: 'It is not your turn',
      };
    }

    if (!move || typeof move !== 'object') {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Move must be an object payload',
      };
    }

    return { ok: true };
  },

  applyMove(
    state: WordBattleState,
    move: WordBattleMove,
    playerId: string,
  ): WordBattleState {
    const validation = this.validateMove(state, move, playerId);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const evalResult = evaluateMove(state, move);
    const nextTurnCount = state.turnCount + 1;

    let nextBoard = state.board;
    let nextBoardVersion = state.boardVersion;
    let nextStep = state.rngStep;
    let lastTransition: BoardTransitionDelta | undefined;

    const nextScores = { ...state.scores };
    const nextLives = { ...state.lives };
    const nextUsedWords = [...state.usedWords];

    if (evalResult.isAccepted && evalResult.resolvedPath) {
      // 1. Scoring & accepted word recording
      nextScores[playerId] = (nextScores[playerId] ?? 0) + evalResult.score;
      nextUsedWords.push(evalResult.normalizedWord);

      // 2. Cascade board and spawn new tiles
      nextBoardVersion = state.boardVersion + 1;
      const cascadeResult = applyCascadeAndSpawn(
        state.board,
        evalResult.resolvedPath,
        nextBoardVersion,
        state.rngSeed,
        state.rngStep,
      );
      nextBoard = cascadeResult.newBoard;
      lastTransition = cascadeResult.delta;
      nextStep = cascadeResult.nextStep;
    } else {
      // Rule violation penalty: Active player loses 1 life, 0 points scored
      const currentLives = state.lives[playerId] ?? STARTING_LIVES;
      nextLives[playerId] = Math.max(0, currentLives - 1);
      lastTransition = undefined;
    }

    const otherPlayer = state.players.find((p) => p.id !== playerId);

    // Check game over
    const isKnockout = Object.values(nextLives).some((l) => l <= 0);
    const isTurnsExhausted = nextTurnCount >= state.totalTurns;
    const isOver = isKnockout || isTurnsExhausted;

    const nextPlayerId = isOver
      ? state.currentPlayerId
      : (otherPlayer?.id ?? state.currentPlayerId);

    const historyEntry: WordBattleTurnHistory = {
      playerId,
      word: evalResult.normalizedWord,
      score: evalResult.isAccepted ? evalResult.score : 0,
    };

    if ('path' in move && move.path && evalResult.resolvedPath) {
      historyEntry.path = evalResult.resolvedPath;
    }
    if (!evalResult.isAccepted && evalResult.penaltyReason) {
      historyEntry.penalty = evalResult.penaltyReason;
    }

    return {
      ...state,
      scores: nextScores,
      lives: nextLives,
      currentPlayerId: nextPlayerId,
      turnCount: nextTurnCount,
      board: nextBoard,
      boardVersion: nextBoardVersion,
      usedWords: nextUsedWords,
      history: [...state.history, historyEntry],
      lastTransition,
      rngStep: nextStep,
    };
  },

  getNextPlayer(state: WordBattleState): string | null {
    if (this.isGameOver(state)) {
      return null;
    }
    return state.currentPlayerId;
  },

  isGameOver(state: WordBattleState): boolean {
    const hasKnockout = Object.values(state.lives).some((l) => l <= 0);
    const hasFinishedTurns = state.turnCount >= state.totalTurns;
    return hasKnockout || hasFinishedTurns;
  },

  getResult(state: WordBattleState): WordBattleResult {
    const [p1, p2] = state.players;
    if (!p1 || !p2) {
      throw new Error('Invalid players');
    }

    const l1 = state.lives[p1.id] ?? 0;
    const l2 = state.lives[p2.id] ?? 0;
    const s1 = state.scores[p1.id] ?? 0;
    const s2 = state.scores[p2.id] ?? 0;

    // 1. Knockout resolution (a player reached 0 lives)
    if (l1 <= 0 && l2 > 0) {
      return {
        winnerId: p2.id,
        scores: { ...state.scores },
        lives: { ...state.lives },
        isDraw: false,
        isKnockout: true,
      };
    }
    if (l2 <= 0 && l1 > 0) {
      return {
        winnerId: p1.id,
        scores: { ...state.scores },
        lives: { ...state.lives },
        isDraw: false,
        isKnockout: true,
      };
    }

    // 2. Turns completed: Compare remaining lives first
    if (l1 > l2) {
      return {
        winnerId: p1.id,
        scores: { ...state.scores },
        lives: { ...state.lives },
        isDraw: false,
        isKnockout: false,
      };
    }
    if (l2 > l1) {
      return {
        winnerId: p2.id,
        scores: { ...state.scores },
        lives: { ...state.lives },
        isDraw: false,
        isKnockout: false,
      };
    }

    // 3. Lives are equal: Compare total score
    if (s1 > s2) {
      return {
        winnerId: p1.id,
        scores: { ...state.scores },
        lives: { ...state.lives },
        isDraw: false,
        isKnockout: false,
      };
    }
    if (s2 > s1) {
      return {
        winnerId: p2.id,
        scores: { ...state.scores },
        lives: { ...state.lives },
        isDraw: false,
        isKnockout: false,
      };
    }

    // 4. Equal lives and equal score = Draw
    return {
      winnerId: null,
      scores: { ...state.scores },
      lives: { ...state.lives },
      isDraw: true,
      isKnockout: false,
    };
  },
};
