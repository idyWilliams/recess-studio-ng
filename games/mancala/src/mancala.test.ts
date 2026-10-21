import { describe, expect, it } from 'vitest';
import type { GamePlayer } from '@recess/game-core';

import { mancalaGame } from './mancala.js';
import type { MancalaState } from './types.js';

describe('Mancala Royale Rules Engine (@recess/game-mancala)', () => {
  const p1: GamePlayer = { id: 'player-1', displayName: 'Ada' };
  const p2: GamePlayer = { id: 'player-2', displayName: 'Grace' };
  const players = [p1, p2];

  // Helper to build a test state with custom pits
  function createTestState(
    pits: number[],
    currentPlayerId: string = p1.id,
    overrides: Partial<MancalaState> = {},
  ): MancalaState {
    return {
      players,
      currentPlayerId,
      scores: {
        [p1.id]: pits[6] ?? 0,
        [p2.id]: pits[13] ?? 0,
      },
      pits,
      variant: 'kalah-6',
      turnCount: 0,
      history: [],
      isGameOver: false,
      ...overrides,
    };
  }

  describe('createInitialState', () => {
    it('initializes standard Kalah 14-pit board with 4 seeds each and 0 in stores', () => {
      const state = mancalaGame.createInitialState(players);

      expect(state.players).toEqual([p1, p2]);
      expect(state.currentPlayerId).toBe(p1.id);
      expect(state.scores).toEqual({ [p1.id]: 0, [p2.id]: 0 });

      // Player 1 pits (0-5)
      expect(state.pits.slice(0, 6)).toEqual([4, 4, 4, 4, 4, 4]);
      // Player 1 store (6)
      expect(state.pits[6]).toBe(0);

      // Player 2 pits (7-12)
      expect(state.pits.slice(7, 13)).toEqual([4, 4, 4, 4, 4, 4]);
      // Player 2 store (13)
      expect(state.pits[13]).toBe(0);

      // Total seeds on board = 48
      const totalSeeds = state.pits.reduce((sum, count) => sum + count, 0);
      expect(totalSeeds).toBe(48);
    });

    it('throws if not provided exactly 2 players', () => {
      expect(() => mancalaGame.createInitialState([p1])).toThrow();
      expect(() => mancalaGame.createInitialState([])).toThrow();
    });
  });

  describe('validateMove', () => {
    it('accepts legal moves for the active player', () => {
      const state = mancalaGame.createInitialState(players);
      expect(mancalaGame.validateMove(state, { pitIndex: 0 }, p1.id)).toEqual({ ok: true });
      expect(mancalaGame.validateMove(state, { pitIndex: 5 }, p1.id)).toEqual({ ok: true });
    });

    it('rejects moves submitted out of turn', () => {
      const state = mancalaGame.createInitialState(players);
      const res = mancalaGame.validateMove(state, { pitIndex: 7 }, p2.id);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('NOT_YOUR_TURN');
      }
    });

    it('rejects selecting opponent pits or stores', () => {
      const state = mancalaGame.createInitialState(players);

      // P1 selecting P2 pit
      const oppRes = mancalaGame.validateMove(state, { pitIndex: 7 }, p1.id);
      expect(oppRes.ok).toBe(false);

      // P1 selecting store 6
      const storeRes = mancalaGame.validateMove(state, { pitIndex: 6 }, p1.id);
      expect(storeRes.ok).toBe(false);

      // P1 selecting store 13
      const oppStoreRes = mancalaGame.validateMove(state, { pitIndex: 13 }, p1.id);
      expect(oppStoreRes.ok).toBe(false);
    });

    it('rejects selecting empty pits', () => {
      const pits = [0, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
      const state = createTestState(pits, p1.id);

      const res = mancalaGame.validateMove(state, { pitIndex: 0 }, p1.id);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe('INVALID_MOVE');
        expect(res.message).toContain('empty');
      }
    });

    it('accepts timeout move for active player', () => {
      const state = mancalaGame.createInitialState(players);
      expect(mancalaGame.validateMove(state, { type: 'timeout' }, p1.id)).toEqual({ ok: true });
    });
  });

  describe('applyMove: Sowing & Store Skipping', () => {
    it('sows seeds counter-clockwise correctly', () => {
      const state = mancalaGame.createInitialState(players);
      // P1 sows from pit 2 (which has 4 seeds) -> seeds land in pits 3, 4, 5, 6
      const next = mancalaGame.applyMove(state, { pitIndex: 2 }, p1.id);

      expect(next.pits[2]).toBe(0);
      expect(next.pits[3]).toBe(5);
      expect(next.pits[4]).toBe(5);
      expect(next.pits[5]).toBe(5);
      expect(next.pits[6]).toBe(1); // landed in P1 store!
      expect(next.scores[p1.id]).toBe(1);
    });

    it('skips opponent store during long sow', () => {
      // P1 has 8 seeds in pit 5: will sow 6, 7, 8, 9, 10, 11, 12, SKIP 13, and land in 0
      const pits = [4, 4, 4, 4, 4, 8, 0, 4, 4, 4, 4, 4, 4, 0];
      const state = createTestState(pits, p1.id);

      const next = mancalaGame.applyMove(state, { pitIndex: 5 }, p1.id);

      expect(next.pits[5]).toBe(0);
      expect(next.pits[6]).toBe(1); // P1 store
      expect(next.pits[7]).toBe(5);
      expect(next.pits[8]).toBe(5);
      expect(next.pits[9]).toBe(5);
      expect(next.pits[10]).toBe(5);
      expect(next.pits[11]).toBe(5);
      expect(next.pits[12]).toBe(5);
      expect(next.pits[13]).toBe(0); // SKIPPED P2 store!
      expect(next.pits[0]).toBe(5); // Landed in pit 0
    });
  });

  describe('applyMove: Extra Turn in Store', () => {
    it('grants an extra turn when last seed lands in own store', () => {
      const state = mancalaGame.createInitialState(players);
      // P1 sows from pit 2 (4 seeds) -> lands in pit 6 (own store)
      const next = mancalaGame.applyMove(state, { pitIndex: 2 }, p1.id);

      expect(next.currentPlayerId).toBe(p1.id); // Stays P1's turn!
      expect(next.history[0]?.grantedExtraTurn).toBe(true);
    });

    it('passes turn to opponent when last seed does not land in store', () => {
      const state = mancalaGame.createInitialState(players);
      // P1 sows from pit 0 (4 seeds) -> lands in pit 4 (not store)
      const next = mancalaGame.applyMove(state, { pitIndex: 0 }, p1.id);

      expect(next.currentPlayerId).toBe(p2.id); // Switches to P2!
      expect(next.history[0]?.grantedExtraTurn).toBe(false);
    });
  });

  describe('applyMove: Opposite Pit Capture', () => {
    it('captures opposite pit seeds when last seed lands in an empty pit on own side', () => {
      // Pit 4 has 0 seeds.
      // Pit 1 has 3 seeds -> will sow into pits 2, 3, 4 (landing in empty pit 4!)
      // Opposite pit to 4 is (12 - 4 = 8). Let pit 8 have 5 seeds.
      const pits = [4, 3, 4, 4, 0, 4, 0, 4, 5, 4, 4, 4, 4, 0];
      const state = createTestState(pits, p1.id);

      const next = mancalaGame.applyMove(state, { pitIndex: 1 }, p1.id);

      expect(next.pits[1]).toBe(0);
      expect(next.pits[4]).toBe(0); // Captured!
      expect(next.pits[8]).toBe(0); // Opposite pit captured!
      // Store 6 received 5 + 1 = 6 seeds
      expect(next.pits[6]).toBe(6);
      expect(next.scores[p1.id]).toBe(6);
      expect(next.history[0]?.capturedSeeds).toBe(6);
    });

    it('does not capture if the opposite pit is empty', () => {
      const pits = [4, 3, 4, 4, 0, 4, 0, 4, 0, 4, 4, 4, 4, 0]; // pit 8 is 0
      const state = createTestState(pits, p1.id);

      const next = mancalaGame.applyMove(state, { pitIndex: 1 }, p1.id);

      // Pit 4 keeps its 1 seed, no capture
      expect(next.pits[4]).toBe(1);
      expect(next.pits[6]).toBe(0);
    });

    it('does not capture on opponent side even if landing in empty pit', () => {
      // P1 lands in an empty pit on P2's side (pit 7).
      // Pit 0 has 4 seeds so P1's side is not empty (preventing board sweep).
      const pits = [4, 0, 0, 0, 0, 2, 0, 0, 4, 4, 4, 4, 4, 0];
      const state = createTestState(pits, p1.id);

      const next = mancalaGame.applyMove(state, { pitIndex: 5 }, p1.id);

      expect(next.pits[7]).toBe(1); // No capture on opponent side
      expect(next.pits[6]).toBe(1); // 1 seed landed in store 6
    });
  });

  describe('Game Over & Board Sweep', () => {
    it('sweeps remaining seeds into player stores when one side is emptied', () => {
      // P1 has 1 seed left in pit 5, all other P1 pits are 0.
      // Sowing from pit 5 lands in store 6, emptying P1's side.
      // P2 has 2 seeds in pit 7, 3 seeds in pit 8.
      const pits = [0, 0, 0, 0, 0, 1, 10, 2, 3, 0, 0, 0, 0, 10];
      const state = createTestState(pits, p1.id);

      const next = mancalaGame.applyMove(state, { pitIndex: 5 }, p1.id);

      expect(mancalaGame.isGameOver(next)).toBe(true);

      // P1 store: 10 + 1 (sown) = 11
      expect(next.pits[6]).toBe(11);
      // P2 remaining seeds (2 + 3 = 5) swept into P2 store: 10 + 5 = 15
      expect(next.pits[13]).toBe(15);

      // All small pits emptied
      expect(next.pits.slice(0, 6).every((s) => s === 0)).toBe(true);
      expect(next.pits.slice(7, 13).every((s) => s === 0)).toBe(true);

      const result = mancalaGame.getResult(next);
      expect(result.winnerId).toBe(p2.id); // 15 > 11
      expect(result.isDraw).toBe(false);
    });

    it('identifies a tie game when final store counts are equal', () => {
      const pits = [0, 0, 0, 0, 0, 1, 23, 0, 0, 0, 0, 0, 0, 24];
      const state = createTestState(pits, p1.id);

      const next = mancalaGame.applyMove(state, { pitIndex: 5 }, p1.id);

      expect(next.pits[6]).toBe(24);
      expect(next.pits[13]).toBe(24);

      const result = mancalaGame.getResult(next);
      expect(result.winnerId).toBeNull();
      expect(result.isDraw).toBe(true);
    });
  });

  describe('applyTimeout', () => {
    it('awards game to opponent when active player times out', () => {
      const state = mancalaGame.createInitialState(players);
      const next = mancalaGame.applyTimeout(state, p1.id);

      expect(mancalaGame.isGameOver(next)).toBe(true);
      const result = mancalaGame.getResult(next);
      expect(result.winnerId).toBe(p2.id);
      expect(result.isTimeout).toBe(true);
    });
  });

  describe('projectPlayerView', () => {
    it('normalizes board orientation for Player 1', () => {
      const state = mancalaGame.createInitialState(players);
      const view = mancalaGame.projectPlayerView(state, p1.id);

      expect(view.viewerSide.pits).toEqual([4, 4, 4, 4, 4, 4]);
      expect(view.viewerSide.store).toBe(0);
      expect(view.opponentSide.pits).toEqual([4, 4, 4, 4, 4, 4]);
      expect(view.isViewerTurn).toBe(true);
    });

    it('normalizes board orientation so Player 2 pits are bottom/viewerSide', () => {
      const state = mancalaGame.createInitialState(players);
      const view = mancalaGame.projectPlayerView(state, p2.id);

      // P2 pits (7-12) become viewerSide
      expect(view.viewerSide.pits).toEqual(state.pits.slice(7, 13));
      expect(view.viewerSide.store).toBe(state.pits[13]);

      // P1 pits (0-5) become opponentSide
      expect(view.opponentSide.pits).toEqual(state.pits.slice(0, 6));
      expect(view.opponentSide.store).toBe(state.pits[6]);
      expect(view.isViewerTurn).toBe(false); // P1 is active
    });
  });
});
