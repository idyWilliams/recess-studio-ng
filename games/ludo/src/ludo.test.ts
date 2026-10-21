import { describe, it, expect } from 'vitest';
import type { GamePlayer } from '@recess/game-core';
import {
  canTokenMove,
  getTrackSquare,
  LudoRulesEngine,
  rollDie,
} from './ludo.js';
import type {
  LudoState,
  LudoToken,
  ProjectedLudoState,
} from './types.js';

const PLAYER_ONE: GamePlayer = { id: 'p1', displayName: 'Chidi' };
const PLAYER_TWO: GamePlayer = { id: 'p2', displayName: 'Tunde' };
const PLAYER_THREE: GamePlayer = { id: 'p3', displayName: 'Amina' };
const PLAYER_FOUR: GamePlayer = { id: 'p4', displayName: 'Efe' };

describe('Ludo Arena Engine (@recess/game-ludo)', () => {
  const engine = new LudoRulesEngine();

  describe('Board Coordinates & Movement Rules', () => {
    it('correctly maps relative step to 52-square track loop for all colors', () => {
      // Red starts at 0
      expect(getTrackSquare('red', 0)).toBe(0);
      expect(getTrackSquare('red', 10)).toBe(10);
      expect(getTrackSquare('red', 50)).toBe(50);
      expect(getTrackSquare('red', 51)).toBeNull(); // home stretch

      // Green starts at 13
      expect(getTrackSquare('green', 0)).toBe(13);
      expect(getTrackSquare('green', 38)).toBe(51); // (13 + 38) % 52 = 51
      expect(getTrackSquare('green', 39)).toBe(0); // wraps around!

      // Yellow starts at 26
      expect(getTrackSquare('yellow', 0)).toBe(26);

      // Blue starts at 39
      expect(getTrackSquare('blue', 0)).toBe(39);
    });

    it('canTokenMove accurately enforces yard unlocking and home bounds', () => {
      const yardToken: LudoToken = {
        id: 'red-0',
        color: 'red',
        index: 0,
        step: -1,
        isHome: false,
      };

      // In yard: only roll of 6 can move
      expect(canTokenMove(yardToken, 1)).toBe(false);
      expect(canTokenMove(yardToken, 5)).toBe(false);
      expect(canTokenMove(yardToken, 6)).toBe(true);

      // On track: can move if within 56 steps
      const trackToken: LudoToken = {
        id: 'red-1',
        color: 'red',
        index: 1,
        step: 52,
        isHome: false,
      };
      expect(canTokenMove(trackToken, 4)).toBe(true); // 52 + 4 = 56 (Home!)
      expect(canTokenMove(trackToken, 5)).toBe(false); // 52 + 5 = 57 (Overshoots home)

      // Already home: cannot move
      const homeToken: LudoToken = {
        id: 'red-2',
        color: 'red',
        index: 2,
        step: 56,
        isHome: true,
      };
      expect(canTokenMove(homeToken, 1)).toBe(false);
    });

    it('rollDie produces uniform 1 to 6 integers deterministically', () => {
      const roll1 = rollDie(1337, 0);
      const roll2 = rollDie(1337, 1);
      expect(roll1).toBeGreaterThanOrEqual(1);
      expect(roll1).toBeLessThanOrEqual(6);
      expect(roll2).toBeGreaterThanOrEqual(1);
      expect(roll2).toBeLessThanOrEqual(6);
    });
  });

  describe('Initial State Setup', () => {
    it('sets up 2-player match with Red vs Yellow and all tokens in yard', () => {
      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO]);

      expect(state.players).toHaveLength(2);
      expect(state.playerColors['p1']).toBe('red');
      expect(state.playerColors['p2']).toBe('yellow');
      expect(state.currentPlayerId).toBe('p1');
      expect(state.currentColor).toBe('red');
      expect(state.turnPhase).toBe('roll');
      expect(state.diceRoll).toBeNull();

      expect(state.tokens.red).toHaveLength(4);
      expect(state.tokens.yellow).toHaveLength(4);
      expect(state.tokens.red.every((t: LudoToken) => t.step === -1 && !t.isHome)).toBe(true);
      expect(state.tokens.yellow.every((t: LudoToken) => t.step === -1 && !t.isHome)).toBe(true);
    });

    it('supports 4-player match with 16 total tokens', () => {
      const state = engine.createInitialState([
        PLAYER_ONE,
        PLAYER_TWO,
        PLAYER_THREE,
        PLAYER_FOUR,
      ]);

      expect(state.players).toHaveLength(4);
      expect(state.tokens.red).toHaveLength(4);
      expect(state.tokens.green).toHaveLength(4);
      expect(state.tokens.yellow).toHaveLength(4);
      expect(state.tokens.blue).toHaveLength(4);
    });
  });

  describe('Move Validation', () => {
    function createMockState(override: Partial<LudoState> = {}): LudoState {
      const base = engine.createInitialState([PLAYER_ONE, PLAYER_TWO]);
      return {
        ...base,
        ...override,
      };
    }

    it('rejects moves from out of turn players', () => {
      const state = createMockState();
      const val = engine.validateMove(state, { type: 'roll' }, 'p2');
      expect(val.ok).toBe(false);
      if (!val.ok) {
        expect(val.reason).toBe('NOT_YOUR_TURN');
      }
    });

    it('rejects token move before rolling die', () => {
      const state = createMockState({ turnPhase: 'roll', diceRoll: null });
      const val = engine.validateMove(state, { tokenId: 'red-0' }, 'p1');
      expect(val.ok).toBe(false);
      if (!val.ok) {
        expect(val.reason).toBe('INVALID_MOVE');
      }
    });

    it('rejects moving yard token if rolled die is not 6', () => {
      const state = createMockState({
        turnPhase: 'move',
        diceRoll: 4,
        tokens: {
          ...createMockState().tokens,
          red: [
            { id: 'red-0', color: 'red', index: 0, step: -1, isHome: false },
            { id: 'red-1', color: 'red', index: 1, step: -1, isHome: false },
            { id: 'red-2', color: 'red', index: 2, step: -1, isHome: false },
            { id: 'red-3', color: 'red', index: 3, step: -1, isHome: false },
          ],
        },
      });

      const val = engine.validateMove(state, { tokenId: 'red-0' }, 'p1');
      expect(val.ok).toBe(false);
    });

    it('allows moving yard token when rolled die is 6', () => {
      const state = createMockState({
        turnPhase: 'move',
        diceRoll: 6,
        tokens: {
          ...createMockState().tokens,
          red: [{ id: 'red-0', color: 'red', index: 0, step: -1, isHome: false }],
        },
      });

      const val = engine.validateMove(state, { tokenId: 'red-0' }, 'p1');
      expect(val.ok).toBe(true);
    });

    it('rejects moving token that would overshoot home step 56', () => {
      const state = createMockState({
        turnPhase: 'move',
        diceRoll: 4,
        tokens: {
          ...createMockState().tokens,
          red: [{ id: 'red-0', color: 'red', index: 0, step: 54, isHome: false }],
        },
      });

      // 54 + 4 = 58 > 56 -> Illegal!
      const val = engine.validateMove(state, { tokenId: 'red-0' }, 'p1');
      expect(val.ok).toBe(false);
    });
  });

  describe('Gameplay Actions & Token Mechanics', () => {
    function createMockState(override: Partial<LudoState> = {}): LudoState {
      const base = engine.createInitialState([PLAYER_ONE, PLAYER_TWO]);
      return {
        ...base,
        ...override,
      };
    }

    it('unblocks token from yard to start square 0 on roll of 6', () => {
      const state = createMockState({
        turnPhase: 'move',
        diceRoll: 6,
        tokens: {
          ...createMockState().tokens,
          red: [{ id: 'red-0', color: 'red', index: 0, step: -1, isHome: false }],
        },
      });

      const next = engine.applyMove(state, { tokenId: 'red-0' }, 'p1');
      expect(next.tokens.red[0]?.step).toBe(0); // On start track!
      // Rolling 6 grants an extra turn roll
      expect(next.currentPlayerId).toBe('p1');
      expect(next.turnPhase).toBe('roll');
      expect(next.diceRoll).toBeNull();
    });

    it('advances token along track by rolled amount and hands over turn on non-6 roll', () => {
      const state = createMockState({
        turnPhase: 'move',
        diceRoll: 4,
        tokens: {
          ...createMockState().tokens,
          red: [{ id: 'red-0', color: 'red', index: 0, step: 5, isHome: false }],
        },
      });

      const next = engine.applyMove(state, { tokenId: 'red-0' }, 'p1');
      expect(next.tokens.red[0]?.step).toBe(9); // 5 + 4 = 9
      expect(next.currentPlayerId).toBe('p2'); // Turn passes to Yellow!
      expect(next.currentColor).toBe('yellow');
      expect(next.turnPhase).toBe('roll');
    });

    it('captures an opponent token on an unsafe square and grants a bonus extra roll', () => {
      // Red token at step 10 (square 10).
      // Yellow starts at 26. A yellow token at relative step 36 is at (26 + 36) % 52 = 10 (same square!).
      // Square 10 is not in SAFE_SQUARES.
      const state = createMockState({
        currentPlayerId: 'p1',
        currentColor: 'red',
        turnPhase: 'move',
        diceRoll: 4,
        tokens: {
          red: [{ id: 'red-0', color: 'red', index: 0, step: 6, isHome: false }], // 6 + 4 = 10
          yellow: [{ id: 'yellow-0', color: 'yellow', index: 0, step: 36, isHome: false }], // square 10
          green: [],
          blue: [],
        },
      });

      const next = engine.applyMove(state, { tokenId: 'red-0' }, 'p1');

      // Red moves to step 10
      expect(next.tokens.red[0]?.step).toBe(10);
      // Yellow token captured! Sent back to yard (-1)
      expect(next.tokens.yellow[0]?.step).toBe(-1);
      // Capturing grants a bonus extra roll!
      expect(next.currentPlayerId).toBe('p1');
      expect(next.turnPhase).toBe('roll');
      expect(next.history[0]?.capturedTokenId).toBe('yellow-0');
    });

    it('does NOT capture an opponent on a safe square', () => {
      // Starting square 0 is safe for Red
      // Yellow starts at 26; relative step 26 is (26 + 26) % 52 = 0.
      const state = createMockState({
        currentPlayerId: 'p2',
        currentColor: 'yellow',
        turnPhase: 'move',
        diceRoll: 2,
        tokens: {
          red: [{ id: 'red-0', color: 'red', index: 0, step: 0, isHome: false }], // square 0 (safe)
          yellow: [{ id: 'yellow-0', color: 'yellow', index: 0, step: 24, isHome: false }], // 24 + 2 = 26 (square 0)
          green: [],
          blue: [],
        },
      });

      const next = engine.applyMove(state, { tokenId: 'yellow-0' }, 'p2');
      // Red token was on safe square 0, so it is NOT captured!
      expect(next.tokens.red[0]?.step).toBe(0);
      expect(next.tokens.yellow[0]?.step).toBe(26);
    });

    it('lands token exactly home at step 56 and triggers victory when all 4 are home', () => {
      const state = createMockState({
        turnPhase: 'move',
        diceRoll: 3,
        tokens: {
          red: [
            { id: 'red-0', color: 'red', index: 0, step: 56, isHome: true },
            { id: 'red-1', color: 'red', index: 1, step: 56, isHome: true },
            { id: 'red-2', color: 'red', index: 2, step: 56, isHome: true },
            { id: 'red-3', color: 'red', index: 3, step: 53, isHome: false }, // 53 + 3 = 56 (Home!)
          ],
          yellow: [{ id: 'yellow-0', color: 'yellow', index: 0, step: 10, isHome: false }],
          green: [],
          blue: [],
        },
      });

      const next = engine.applyMove(state, { tokenId: 'red-3' }, 'p1');
      expect(next.tokens.red[3]?.step).toBe(56);
      expect(next.tokens.red[3]?.isHome).toBe(true);

      // All 4 are home! Game over!
      expect(next.isGameOver).toBe(true);
      expect(engine.isGameOver(next)).toBe(true);

      const result = engine.getResult(next);
      expect(result.winnerId).toBe('p1');
      expect(result.winnerColor).toBe('red');
      expect(result.tokensHome['p1']).toBe(4);
    });

    it('handles timeout forfeiture cleanly', () => {
      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO]);
      const timedOutState = engine.applyTimeout(state, 'p1');

      expect(timedOutState.isGameOver).toBe(true);
      const result = engine.getResult(timedOutState);
      expect(result.winnerId).toBe('p2');
      expect(result.winnerColor).toBe('yellow');
      expect(result.isTimeout).toBe(true);
    });
  });

  describe('Fog-of-War Projection (projectPlayerView)', () => {
    it('reveals token coordinates, marks safety, computes legal moves, and strips PRNG seed', () => {
      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO], { seed: 888 });
      // Set to move phase with roll of 6
      const rollState: LudoState = {
        ...state,
        turnPhase: 'move',
        diceRoll: 6,
      };

      const projected = engine.projectPlayerView(rollState, 'p1') as ProjectedLudoState;

      expect(projected.currentPlayerId).toBe('p1');
      expect(projected.isViewerTurn).toBe(true);
      expect(projected.turnPhase).toBe('move');
      expect(projected.diceRoll).toBe(6);

      // On roll 6, all 4 red tokens in yard can legally move!
      expect(projected.legalTokenMoves).toHaveLength(4);
      expect(projected.legalTokenMoves).toContain('red-0');

      // Tokens have projected trackSquare and isSafe flags
      const red0 = projected.tokens.red[0];
      expect(red0?.trackSquare).toBeNull(); // in yard
      expect(red0?.isSafe).toBe(false);

      // PRNG seed is stripped
      expect((projected as unknown as { rngSeed?: unknown }).rngSeed).toBeUndefined();
    });

    it('safely handles empty or waiting session state', () => {
      const emptyState = {} as any;
      const projected = engine.projectPlayerView(emptyState, 'p1');
      expect(projected).toEqual({});
    });
  });
});
