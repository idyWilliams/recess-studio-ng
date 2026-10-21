import { describe, expect, it } from 'vitest';

import type { GamePlayer } from '@recess/game-core';

import {
  evaluateMove,
  generateBoardTiles,
  isAdjacent,
  mulberry32,
  validateBoardPath,
  wordBattleGame,
} from './word-battle.js';
import type { BoardCoordinate, BoardTile, WordBattleState } from './types.js';

describe('Word Battle — Game Core (Stage 1 Deterministic Rules)', () => {
  const players: GamePlayer[] = [
    { id: 'p1', displayName: 'Alice' },
    { id: 'p2', displayName: 'Bob' },
  ];

  describe('Board Generation and Seeded PRNG', () => {
    it('creates initial state with 4x4 board, 3 lives each, and 0 scores', () => {
      const state = wordBattleGame.createInitialState(players, { seed: 12345 });

      expect(state.players).toEqual(players);
      expect(state.currentPlayerId).toBe('p1');
      expect(state.scores).toEqual({ p1: 0, p2: 0 });
      expect(state.lives).toEqual({ p1: 3, p2: 3 });
      expect(state.turnCount).toBe(0);
      expect(state.totalTurns).toBe(10);
      expect(state.boardVersion).toBe(0);
      expect(state.usedWords).toEqual([]);
      expect(state.history).toEqual([]);

      // 4x4 grid verification
      expect(state.board.length).toBe(4);
      for (let r = 0; r < 4; r++) {
        expect(state.board[r]!.length).toBe(4);
        for (let c = 0; c < 4; c++) {
          const tile = state.board[r]![c]!;
          expect(tile.row).toBe(r);
          expect(tile.col).toBe(c);
          expect(tile.letter).toMatch(/^[A-Z]$/);
          expect(tile.id).toBe(`t_r${r}_c${c}_v0`);
        }
      }
    });

    it('rejects creation with player count !== 2', () => {
      expect(() =>
        wordBattleGame.createInitialState([{ id: 'p1', displayName: 'Solo' }]),
      ).toThrow('Word Battle requires exactly 2 players');
    });

    it('produces identical board layout for identical PRNG seed', () => {
      const state1 = wordBattleGame.createInitialState(players, { seed: 9999 });
      const state2 = wordBattleGame.createInitialState(players, { seed: 9999 });

      expect(state1.board).toEqual(state2.board);
    });

    it('produces balanced vowels between 4 and 7 in the 16 tiles', () => {
      const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
      for (const seed of [1, 42, 100, 2024, 77777]) {
        const { board } = generateBoardTiles(seed, 0, 0);
        let vowelCount = 0;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (vowels.has(board[r]![c]!.letter)) vowelCount++;
          }
        }
        expect(vowelCount).toBeGreaterThanOrEqual(4);
        expect(vowelCount).toBeLessThanOrEqual(7);
      }
    });

    it('Mulberry32 produces deterministic pseudo-random float sequence', () => {
      const r1 = mulberry32(1234, 0);
      const r2 = mulberry32(1234, 0);
      const r3 = mulberry32(1234, 1);
      expect(r1).toBe(r2);
      expect(r1).not.toBe(r3);
      expect(r1).toBeGreaterThanOrEqual(0);
      expect(r1).toBeLessThan(1);
    });

    it('produces 100% identical refilled boards when given identical seed and valid moves', () => {
      const seed = 54321;
      const game1 = wordBattleGame.createInitialState(players, { seed });
      const game2 = wordBattleGame.createInitialState(players, { seed });

      expect(game1.board).toEqual(game2.board);
      expect(game1.rngStep).toBe(game2.rngStep);

      const move = {
        word: 'cat',
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        isDictionaryValid: true,
      };

      // Set tiles at path to match 'CAT' for deterministic move acceptance
      game1.board[0]![0]!.letter = 'C';
      game1.board[0]![1]!.letter = 'A';
      game1.board[0]![2]!.letter = 'T';
      game2.board[0]![0]!.letter = 'C';
      game2.board[0]![1]!.letter = 'A';
      game2.board[0]![2]!.letter = 'T';

      const afterMove1 = wordBattleGame.applyMove(game1, move, 'p1');
      const afterMove2 = wordBattleGame.applyMove(game2, move, 'p1');

      expect(afterMove1.board).toEqual(afterMove2.board);
      expect(afterMove1.rngStep).toBe(afterMove2.rngStep);
      expect(afterMove1.boardVersion).toBe(1);
      expect(afterMove2.boardVersion).toBe(1);
      expect(afterMove1.lastTransition).toEqual(afterMove2.lastTransition);
    });
  });

  describe('Adjacency and Path Validation', () => {
    it('verifies horizontal, vertical, and diagonal adjacency', () => {
      const origin: BoardCoordinate = { row: 1, col: 1 };
      // Horizontal
      expect(isAdjacent(origin, { row: 1, col: 2 })).toBe(true);
      expect(isAdjacent(origin, { row: 1, col: 0 })).toBe(true);
      // Vertical
      expect(isAdjacent(origin, { row: 0, col: 1 })).toBe(true);
      expect(isAdjacent(origin, { row: 2, col: 1 })).toBe(true);
      // Diagonal
      expect(isAdjacent(origin, { row: 0, col: 0 })).toBe(true);
      expect(isAdjacent(origin, { row: 2, col: 2 })).toBe(true);
      expect(isAdjacent(origin, { row: 0, col: 2 })).toBe(true);
      expect(isAdjacent(origin, { row: 2, col: 0 })).toBe(true);

      // Same tile is NOT adjacent
      expect(isAdjacent(origin, origin)).toBe(false);
      // Distance > 1 is NOT adjacent
      expect(isAdjacent(origin, { row: 1, col: 3 })).toBe(false);
      expect(isAdjacent(origin, { row: 3, col: 1 })).toBe(false);
      expect(isAdjacent(origin, { row: 3, col: 3 })).toBe(false);
    });

    it('rejects path containing disconnected tiles or leaps', () => {
      const mockBoard: BoardTile[][] = [
        [
          { id: '1', letter: 'C', row: 0, col: 0 },
          { id: '2', letter: 'A', row: 0, col: 1 },
          { id: '3', letter: 'X', row: 0, col: 2 },
          { id: '4', letter: 'T', row: 0, col: 3 },
        ],
        [
          { id: '5', letter: 'O', row: 1, col: 0 },
          { id: '6', letter: 'R', row: 1, col: 1 },
          { id: '7', letter: 'E', row: 1, col: 2 },
          { id: '8', letter: 'S', row: 1, col: 3 },
        ],
        [
          { id: '9', letter: 'M', row: 2, col: 0 },
          { id: '10', letter: 'A', row: 2, col: 1 },
          { id: '11', letter: 'T', row: 2, col: 2 },
          { id: '12', letter: 'H', row: 2, col: 3 },
        ],
        [
          { id: '13', letter: 'P', row: 3, col: 0 },
          { id: '14', letter: 'L', row: 3, col: 1 },
          { id: '15', letter: 'A', row: 3, col: 2 },
          { id: '16', letter: 'Y', row: 3, col: 3 },
        ],
      ];

      // Jump from (0,1) to (0,3) skipping col 2
      const leapPath: BoardCoordinate[] = [
        { row: 0, col: 0 }, // C
        { row: 0, col: 1 }, // A
        { row: 0, col: 3 }, // T
      ];

      const res = validateBoardPath(mockBoard, 'cat', leapPath);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('ILLEGAL_PATH');
    });

    it('rejects path that reuses a tile within the same word', () => {
      const mockBoard: BoardTile[][] = [
        [
          { id: '1', letter: 'P', row: 0, col: 0 },
          { id: '2', letter: 'O', row: 0, col: 1 },
          { id: '3', letter: 'P', row: 0, col: 2 },
          { id: '4', letter: 'S', row: 0, col: 3 },
        ],
        [
          { id: '5', letter: 'A', row: 1, col: 0 },
          { id: '6', letter: 'B', row: 1, col: 1 },
          { id: '7', letter: 'C', row: 1, col: 2 },
          { id: '8', letter: 'D', row: 1, col: 3 },
        ],
        [
          { id: '9', letter: 'E', row: 2, col: 0 },
          { id: '10', letter: 'F', row: 2, col: 1 },
          { id: '11', letter: 'G', row: 2, col: 2 },
          { id: '12', letter: 'H', row: 2, col: 3 },
        ],
        [
          { id: '13', letter: 'I', row: 3, col: 0 },
          { id: '14', letter: 'J', row: 3, col: 1 },
          { id: '15', letter: 'K', row: 3, col: 2 },
          { id: '16', letter: 'L', row: 3, col: 3 },
        ],
      ];

      // Tries to spell "POP" using tile (0,0) twice: (0,0) -> (0,1) -> (0,0)
      const reusePath: BoardCoordinate[] = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 0 },
      ];

      const res = validateBoardPath(mockBoard, 'pop', reusePath);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('ILLEGAL_PATH');
      expect(res.message).toContain('more than once');
    });

    it('rejects path when board tile letter does not match word character', () => {
      const mockBoard: BoardTile[][] = [
        [
          { id: '1', letter: 'C', row: 0, col: 0 },
          { id: '2', letter: 'A', row: 0, col: 1 },
          { id: '3', letter: 'Z', row: 0, col: 2 }, // 'Z' instead of 'T'
          { id: '4', letter: 'S', row: 0, col: 3 },
        ],
        [
          { id: '5', letter: 'A', row: 1, col: 0 },
          { id: '6', letter: 'B', row: 1, col: 1 },
          { id: '7', letter: 'C', row: 1, col: 2 },
          { id: '8', letter: 'D', row: 1, col: 3 },
        ],
        [
          { id: '9', letter: 'E', row: 2, col: 0 },
          { id: '10', letter: 'F', row: 2, col: 1 },
          { id: '11', letter: 'G', row: 2, col: 2 },
          { id: '12', letter: 'H', row: 2, col: 3 },
        ],
        [
          { id: '13', letter: 'I', row: 3, col: 0 },
          { id: '14', letter: 'J', row: 3, col: 1 },
          { id: '15', letter: 'K', row: 3, col: 2 },
          { id: '16', letter: 'L', row: 3, col: 3 },
        ],
      ];

      const path: BoardCoordinate[] = [
        { row: 0, col: 0 }, // C
        { row: 0, col: 1 }, // A
        { row: 0, col: 2 }, // Z (not T)
      ];

      const res = validateBoardPath(mockBoard, 'cat', path);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('ILLEGAL_PATH');
    });

    it('rejects words shorter than 3 letters', () => {
      const state = wordBattleGame.createInitialState(players);
      const next = wordBattleGame.applyMove(state, { word: 'hi' }, 'p1');

      // Rejected with life loss
      expect(next.lives.p1).toBe(2);
      expect(next.scores.p1).toBe(0);
      expect(next.history[0]?.penalty).toBe('TOO_SHORT');
      expect(next.currentPlayerId).toBe('p2');
    });
  });

  describe('Tile Consumption, Column Gravity and Spawning', () => {
    it('consumes tiles, drops surviving tiles downward within columns, and spawns new tiles at top', () => {
      // Construct controlled state with known tiles
      const state = wordBattleGame.createInitialState(players, { seed: 54321 });

      // Force top-left tiles:
      // (0,0)=C, (0,1)=A, (0,2)=T
      // (1,0)=D, (1,1)=O, (1,2)=G
      // (2,0)=R, (2,1)=U, (2,2)=N
      // (3,0)=S, (3,1)=E, (3,2)=T
      state.board[0]![0] = { id: 't_00', letter: 'C', row: 0, col: 0 };
      state.board[0]![1] = { id: 't_01', letter: 'A', row: 0, col: 1 };
      state.board[0]![2] = { id: 't_02', letter: 'T', row: 0, col: 2 };

      state.board[1]![0] = { id: 't_10', letter: 'D', row: 1, col: 0 };
      state.board[1]![1] = { id: 't_11', letter: 'O', row: 1, col: 1 };
      state.board[1]![2] = { id: 't_12', letter: 'G', row: 1, col: 2 };

      state.board[2]![0] = { id: 't_20', letter: 'R', row: 2, col: 0 };
      state.board[2]![1] = { id: 't_21', letter: 'U', row: 2, col: 1 };
      state.board[2]![2] = { id: 't_22', letter: 'N', row: 2, col: 2 };

      state.board[3]![0] = { id: 't_30', letter: 'S', row: 3, col: 0 };
      state.board[3]![1] = { id: 't_31', letter: 'E', row: 3, col: 1 };
      state.board[3]![2] = { id: 't_32', letter: 'T', row: 3, col: 2 };

      // Play "DOG" along row 1: (1,0), (1,1), (1,2)
      const path: BoardCoordinate[] = [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ];

      const next = wordBattleGame.applyMove(state, { word: 'dog', path }, 'p1');

      expect(next.scores.p1).toBe(3);
      expect(next.lives.p1).toBe(3);
      expect(next.boardVersion).toBe(1);
      expect(next.usedWords).toEqual(['dog']);
      expect(next.currentPlayerId).toBe('p2');

      const transition = next.lastTransition!;
      expect(transition).toBeDefined();
      expect(transition.consumedTileIds).toEqual(['t_10', 't_11', 't_12']);

      // For column 0:
      // Tile (0,0) was above (1,0), so it should fall downward from row 0 to row 1!
      // Row 2 ('R') and Row 3 ('S') were below, so they stay at rows 2 and 3.
      expect(next.board[3]![0]!.id).toBe('t_30'); // 'S'
      expect(next.board[2]![0]!.id).toBe('t_20'); // 'R'
      expect(next.board[1]![0]!.id).toBe('t_00'); // 'C' cascaded down!
      expect(next.board[1]![0]!.row).toBe(1);

      // Row 0 gets a newly spawned replacement tile
      expect(next.board[0]![0]!.id).toMatch(/^t_r0_c0_v1$/);

      // Verify cascaded movement tracking
      const c0Move = transition.cascadedTiles.find((t) => t.tileId === 't_00');
      expect(c0Move).toEqual({
        tileId: 't_00',
        fromRow: 0,
        toRow: 1,
        col: 0,
      });

      // Exactly 3 new spawned tiles across columns 0, 1, 2
      expect(transition.spawnedTiles.length).toBe(3);
      expect(transition.spawnedTiles.map((t) => t.col)).toEqual([0, 1, 2]);
    });
  });

  describe('Match-Wide Word Uniqueness', () => {
    it('prevents any accepted word from scoring again for either player', () => {
      let state = wordBattleGame.createInitialState(players, { seed: 1111 });

      // Force playable word "CAT" at (0,0), (0,1), (0,2)
      state.board[0]![0] = { id: 't_00', letter: 'C', row: 0, col: 0 };
      state.board[0]![1] = { id: 't_01', letter: 'A', row: 0, col: 1 };
      state.board[0]![2] = { id: 't_02', letter: 'T', row: 0, col: 2 };

      const catPath: BoardCoordinate[] = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ];

      // Turn 1: Alice plays "CAT" -> Accepted (+3 pts)
      state = wordBattleGame.applyMove(state, { word: 'cat', path: catPath }, 'p1');
      expect(state.scores.p1).toBe(3);
      expect(state.lives.p1).toBe(3);
      expect(state.usedWords).toContain('cat');
      expect(state.currentPlayerId).toBe('p2');

      // Re-plant "CAT" on the board to simulate it being spelled again
      state.board[3]![0] = { id: 't_30', letter: 'C', row: 3, col: 0 };
      state.board[3]![1] = { id: 't_31', letter: 'A', row: 3, col: 1 };
      state.board[3]![2] = { id: 't_32', letter: 'T', row: 3, col: 2 };

      const catPath2: BoardCoordinate[] = [
        { row: 3, col: 0 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
      ];

      // Turn 2: Bob tries to play "CAT" -> REJECTED DUPLICATE!
      state = wordBattleGame.applyMove(state, { word: 'CAT', path: catPath2 }, 'p2');

      // Bob loses 1 life, scores 0, and turn passes back to Alice
      expect(state.scores.p2).toBe(0);
      expect(state.lives.p2).toBe(2); // 3 -> 2
      expect(state.history[1]?.penalty).toBe('DUPLICATE_WORD');
      expect(state.currentPlayerId).toBe('p1');

      // Turn 3: Alice tries to play "CAT" again -> ALSO REJECTED!
      state = wordBattleGame.applyMove(state, { word: 'cat', path: catPath2 }, 'p1');
      expect(state.scores.p1).toBe(3); // unchanged
      expect(state.lives.p1).toBe(2); // Alice loses life too!
      expect(state.history[2]?.penalty).toBe('DUPLICATE_WORD');
      expect(state.currentPlayerId).toBe('p2');
    });
  });

  describe('Survival, Lives, Knockouts and Match Results', () => {
    it('eliminating all 3 lives immediately ends the game via knockout', () => {
      let state = wordBattleGame.createInitialState(players, { seed: 2222 });

      // Turn 1: P1 plays invalid short word -> loses life 1 (2 lives remaining)
      state = wordBattleGame.applyMove(state, { word: 'no' }, 'p1');
      expect(state.lives.p1).toBe(2);
      expect(wordBattleGame.isGameOver(state)).toBe(false);
      expect(state.currentPlayerId).toBe('p2');

      // Turn 2: P2 plays timeout -> loses life 1 (2 lives remaining)
      state = wordBattleGame.applyMove(state, { type: 'timeout' }, 'p2');
      expect(state.lives.p2).toBe(2);
      expect(wordBattleGame.isGameOver(state)).toBe(false);
      expect(state.currentPlayerId).toBe('p1');

      // Turn 3: P1 plays illegal path -> loses life 2 (1 life remaining)
      state = wordBattleGame.applyMove(
        state,
        {
          word: 'xyz',
          path: [
            { row: 0, col: 0 },
            { row: 0, col: 3 }, // leap
            { row: 3, col: 3 },
          ],
        },
        'p1',
      );
      expect(state.lives.p1).toBe(1);
      expect(wordBattleGame.isGameOver(state)).toBe(false);

      // Turn 4: P2 plays timeout -> loses life 2 (1 life remaining)
      state = wordBattleGame.applyMove(state, { type: 'timeout' }, 'p2');
      expect(state.lives.p2).toBe(1);

      // Turn 5: P1 plays timeout -> loses life 3 (0 lives remaining -> KNOCKOUT!)
      state = wordBattleGame.applyMove(state, { type: 'timeout' }, 'p1');
      expect(state.lives.p1).toBe(0);

      // Game is immediately over by Knockout on turn 5 (well before turn 10)
      expect(wordBattleGame.isGameOver(state)).toBe(true);
      expect(wordBattleGame.getNextPlayer(state)).toBeNull();

      const result = wordBattleGame.getResult(state);
      expect(result.isKnockout).toBe(true);
      expect(result.winnerId).toBe('p2'); // P2 survived!
      expect(result.isDraw).toBe(false);

      // Moves after game over are rejected
      const overMove = wordBattleGame.validateMove(state, { word: 'test' }, 'p2');
      expect(overMove.ok).toBe(false);
      if (!overMove.ok) expect(overMove.reason).toBe('GAME_OVER');
    });

    it('turn 10 completion tie-breaker: compares remaining lives first', () => {
      let state = wordBattleGame.createInitialState(players, { seed: 3333 });

      // Simulate 10 turns where P1 has higher score (12 pts vs 9 pts)
      // BUT P1 lost 1 life (lives: P1=2, P2=3).
      // Specification: "compare remaining lives first, then total score."
      // P2 has 3 lives, P1 has 2 lives -> P2 MUST WIN!
      for (let t = 0; t < 10; t++) {
        const playerId = t % 2 === 0 ? 'p1' : 'p2';
        if (t === 0) {
          // P1 loses a life on turn 1
          state = wordBattleGame.applyMove(state, { type: 'timeout' }, playerId);
        } else {
          // Both players score by synthesizing acceptable turns
          state.scores[playerId] = (state.scores[playerId] ?? 0) + (playerId === 'p1' ? 3 : 2);
          state.turnCount++;
          state.currentPlayerId = playerId === 'p1' ? 'p2' : 'p1';
        }
      }

      state.scores.p1 = 15;
      state.scores.p2 = 10;
      state.lives.p1 = 2;
      state.lives.p2 = 3;

      expect(wordBattleGame.isGameOver(state)).toBe(true);
      const result = wordBattleGame.getResult(state);

      // P2 has more lives remaining, so P2 wins despite lower score!
      expect(result.winnerId).toBe('p2');
      expect(result.isKnockout).toBe(false);
      expect(result.isDraw).toBe(false);
    });

    it('turn 10 completion tie-breaker: compares scores when lives are equal', () => {
      const state = wordBattleGame.createInitialState(players, { seed: 4444 });
      state.turnCount = 10;
      state.lives = { p1: 3, p2: 3 }; // equal lives
      state.scores = { p1: 18, p2: 14 }; // P1 higher score

      expect(wordBattleGame.isGameOver(state)).toBe(true);
      const result = wordBattleGame.getResult(state);
      expect(result.winnerId).toBe('p1');
      expect(result.isDraw).toBe(false);
    });

    it('turn 10 completion tie-breaker: reports draw when both lives and scores are equal', () => {
      const state = wordBattleGame.createInitialState(players, { seed: 5555 });
      state.turnCount = 10;
      state.lives = { p1: 2, p2: 2 }; // equal lives
      state.scores = { p1: 15, p2: 15 }; // equal score

      expect(wordBattleGame.isGameOver(state)).toBe(true);
      const result = wordBattleGame.getResult(state);
      expect(result.winnerId).toBeNull();
      expect(result.isDraw).toBe(true);
    });
  });

  describe('Move Structure and Validation Boundaries', () => {
    it('rejects moves out of turn with NOT_YOUR_TURN', () => {
      const state = wordBattleGame.createInitialState(players);
      const res = wordBattleGame.validateMove(state, { word: 'cat' }, 'p2');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe('NOT_YOUR_TURN');
    });

    it('rejects null or non-object move payload with INVALID_MOVE', () => {
      const state = wordBattleGame.createInitialState(players);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = wordBattleGame.validateMove(state, null as any, 'p1');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe('INVALID_MOVE');
    });

    it('proves tile IDs are strictly collision-free and board remains 4x4 across multiple consecutive cascades', () => {
      let state = wordBattleGame.createInitialState(players, { seed: 8888 });
      const allSeenTileIds = new Set<string>();

      // Record initial 16 tile IDs
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          allSeenTileIds.add(state.board[r]![c]!.id);
        }
      }
      expect(allSeenTileIds.size).toBe(16);

      // Execute 4 successive valid moves with different paths
      for (let m = 0; m < 4; m++) {
        const playerId = state.currentPlayerId;
        // Construct a legal path on current board:
        const path: BoardCoordinate[] = [
          { row: 3, col: m },
          { row: 2, col: m },
          { row: 1, col: m },
        ];
        const word = path.map((p) => state.board[p.row]![p.col]!.letter).join('').toLowerCase();
        state = wordBattleGame.applyMove(state, { word, path }, playerId);

        // Confirm board remains strictly 4x4
        expect(state.board.length).toBe(4);
        for (let r = 0; r < 4; r++) {
          expect(state.board[r]!.length).toBe(4);
          for (let c = 0; c < 4; c++) {
            expect(state.board[r]![c]!.row).toBe(r);
            expect(state.board[r]![c]!.col).toBe(c);
          }
        }

        // Check newly spawned tile IDs
        const delta = state.lastTransition!;
        expect(delta).toBeDefined();
        for (const spawned of delta.spawnedTiles) {
          expect(allSeenTileIds.has(spawned.id)).toBe(false); // MUST BE GLOBALLY UNIQUE
          allSeenTileIds.add(spawned.id);
        }
      }
    });

    it('verifies state serialization, restoration, and PRNG continuity', () => {
      const state = wordBattleGame.createInitialState(players, { seed: 7777 });

      // Serialize and restore via JSON (simulating DB JSONB persistence)
      const serialized = JSON.stringify(state);
      const restored: WordBattleState = JSON.parse(serialized);

      // Force matching tile at (0,0)-(0,2)
      state.board[0]![0] = { id: 't1', letter: 'C', row: 0, col: 0 };
      state.board[0]![1] = { id: 't2', letter: 'A', row: 0, col: 1 };
      state.board[0]![2] = { id: 't3', letter: 'T', row: 0, col: 2 };

      restored.board[0]![0] = { id: 't1', letter: 'C', row: 0, col: 0 };
      restored.board[0]![1] = { id: 't2', letter: 'A', row: 0, col: 1 };
      restored.board[0]![2] = { id: 't3', letter: 'T', row: 0, col: 2 };

      const path: BoardCoordinate[] = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ];

      const next1 = wordBattleGame.applyMove(state, { word: 'cat', path }, 'p1');
      const next2 = wordBattleGame.applyMove(restored, { word: 'cat', path }, 'p1');

      expect(next1).toEqual(next2);
    });

    it('verifies rejected and penalized moves do not mutate original state in place', () => {
      const state = wordBattleGame.createInitialState(players, { seed: 6666 });
      const boardSnapshot = JSON.stringify(state.board);
      const scoresSnapshot = JSON.stringify(state.scores);
      const livesSnapshot = JSON.stringify(state.lives);

      // Invalid move attempt with illegal leap path
      const next = wordBattleGame.applyMove(
        state,
        {
          word: 'xyz',
          path: [
            { row: 0, col: 0 },
            { row: 3, col: 3 },
            { row: 0, col: 3 },
          ],
        },
        'p1',
      );

      // Original state is completely unmutated
      expect(JSON.stringify(state.board)).toBe(boardSnapshot);
      expect(JSON.stringify(state.scores)).toBe(scoresSnapshot);
      expect(JSON.stringify(state.lives)).toBe(livesSnapshot);
      expect(state.turnCount).toBe(0);

      // Next state reflects penalty cleanly
      expect(next.scores.p1).toBe(0);
      expect(next.lives.p1).toBe(2);
      expect(next.turnCount).toBe(1);
    });
  });

  describe('Board Validation Bypass Prevention (Stage 2)', () => {
    // The exact board from the Stage 2 takeover review. Only words formable on THIS
    // board may ever score or consume tiles.
    const REPORT_BOARD_ROWS = ['YGLT', 'MHAS', 'ZTLW', 'UXOE'];

    function boardFromRows(rows: string[]): BoardTile[][] {
      return rows.map((letters, r) =>
        letters.split('').map((letter, c) => ({
          id: `t_r${r}_c${c}_v0`,
          letter,
          row: r,
          col: c,
        })),
      );
    }

    function stateWithReportBoard(): WordBattleState {
      const state = wordBattleGame.createInitialState(players, { seed: 1 });
      state.board = boardFromRows(REPORT_BOARD_ROWS);
      return state;
    }

    function expectIllegalPathPenalty(next: WordBattleState, word: string) {
      expect(next.scores.p1).toBe(0); // no points
      expect(next.lives.p1).toBe(2); // 1 life lost
      expect(next.boardVersion).toBe(0); // board untouched
      expect(next.usedWords).toEqual([]); // not recorded as used
      expect(next.currentPlayerId).toBe('p2'); // turn passes
      expect(next.history).toHaveLength(1);
      expect(next.history[0]).toMatchObject({ playerId: 'p1', word, score: 0, penalty: 'ILLEGAL_PATH' });
    }

    it('rejects "xylophones" with no path (not formable: board has no P or N)', () => {
      const state = stateWithReportBoard();

      const evaluation = evaluateMove(state, { word: 'xylophones' });
      expect(evaluation.isAccepted).toBe(false);
      expect(evaluation.penaltyReason).toBe('ILLEGAL_PATH');

      const next = wordBattleGame.applyMove(state, { word: 'xylophones' }, 'p1');
      expectIllegalPathPenalty(next, 'xylophones');
      expect(next.board).toEqual(state.board);
    });

    it('rejects "zzzqqq" with no path (Q is absent from the board)', () => {
      const state = stateWithReportBoard();

      const next = wordBattleGame.applyMove(state, { word: 'zzzqqq' }, 'p1');
      expectIllegalPathPenalty(next, 'zzzqqq');
    });

    it('still accepts a formable word with no path via bounded DFS ("has")', () => {
      const state = stateWithReportBoard();

      const evaluation = evaluateMove(state, { word: 'has' });
      expect(evaluation.isAccepted).toBe(true);
      expect(evaluation.score).toBe(3);
      expect(evaluation.resolvedPath).toEqual([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);

      const next = wordBattleGame.applyMove(state, { word: 'has' }, 'p1');
      expect(next.scores.p1).toBe(3);
      expect(next.lives.p1).toBe(3);
      expect(next.usedWords).toEqual(['has']);
      expect(next.boardVersion).toBe(1); // board cascaded and refilled
    });

    it('accepts an explicit valid path and cascades the board', () => {
      const state = stateWithReportBoard();

      const next = wordBattleGame.applyMove(
        state,
        {
          word: 'has',
          path: [
            { row: 1, col: 1 },
            { row: 1, col: 2 },
            { row: 1, col: 3 },
          ],
        },
        'p1',
      );

      expect(next.scores.p1).toBe(3);
      expect(next.boardVersion).toBe(1);
    });

    it('rejects an explicit path whose tiles do not match the word letters', () => {
      // Row 0 is Y G L T — the word "cat" cannot be spelled by those tiles.
      const state = stateWithReportBoard();

      const next = wordBattleGame.applyMove(
        state,
        {
          word: 'cat',
          path: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
          ],
        },
        'p1',
      );

      expectIllegalPathPenalty(next, 'cat');
    });

    it('rejects a path containing an out-of-bounds coordinate', () => {
      const state = stateWithReportBoard();

      const next = wordBattleGame.applyMove(
        state,
        {
          word: 'has',
          path: [
            { row: 1, col: 1 },
            { row: 1, col: 2 },
            { row: 4, col: 3 },
          ],
        },
        'p1',
      );

      expectIllegalPathPenalty(next, 'has');
    });

    it('rejects a path that reuses a tile within the same word', () => {
      // "hah" would require using the single H tile twice.
      const state = stateWithReportBoard();

      const next = wordBattleGame.applyMove(
        state,
        {
          word: 'hah',
          path: [
            { row: 1, col: 1 },
            { row: 1, col: 2 },
            { row: 1, col: 1 },
          ],
        },
        'p1',
      );

      expectIllegalPathPenalty(next, 'hah');
    });

    it('rejects a path whose length does not match the word length', () => {
      const state = stateWithReportBoard();

      const next = wordBattleGame.applyMove(
        state,
        {
          word: 'has',
          path: [
            { row: 1, col: 1 },
            { row: 1, col: 2 },
          ],
        },
        'p1',
      );

      expectIllegalPathPenalty(next, 'has');
    });

    it('rejects a word longer than the board via a bounded, terminating search', () => {
      const state = stateWithReportBoard();
      const tooLong = 'a'.repeat(20);

      const evaluation = evaluateMove(state, { word: tooLong });
      expect(evaluation.isAccepted).toBe(false);
      expect(evaluation.penaltyReason).toBe('ILLEGAL_PATH');

      const next = wordBattleGame.applyMove(state, { word: tooLong }, 'p1');
      expectIllegalPathPenalty(next, tooLong);
    });
  });
});
