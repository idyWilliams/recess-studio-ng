import type {
  GameCartridge,
  GameInitContext,
  GamePlayer,
  GameValidationResult,
} from '@recess/game-core';

import { MANCALA_GAME_ID, mancalaMeta } from './meta.js';
import {
  MANCALA_DEFAULT_SEEDS,
  MANCALA_TOTAL_PITS,
  P1_PITS,
  P1_STORE,
  P2_PITS,
  P2_STORE,
  type MancalaMove,
  type MancalaPitMove,
  type MancalaResult,
  type MancalaState,
  type MancalaTurnHistory,
  type ProjectedMancalaView,
} from './types.js';

export class MancalaRulesEngine implements GameCartridge<MancalaState, MancalaMove, MancalaResult> {
  readonly id = MANCALA_GAME_ID;
  readonly gameId = MANCALA_GAME_ID;
  readonly name = 'Mancala Royale';
  readonly version = '1.0.0';
  readonly minPlayers = 2;
  readonly maxPlayers = 2;
  readonly metadata = mancalaMeta;

  createInitialState(
    contextOrPlayers: GamePlayer[] | GameInitContext,
    _options?: { seed?: number; [key: string]: unknown },
  ): MancalaState {
    const players = Array.isArray(contextOrPlayers)
      ? contextOrPlayers
      : contextOrPlayers.players;

    if (!players || players.length !== 2) {
      throw new Error('Mancala Royale requires exactly 2 players');
    }

    const [p1, p2] = players;
    if (!p1 || !p2) {
      throw new Error('Invalid players provided to Mancala Royale');
    }

    // Set up standard 14 pits (4 seeds per small pit, 0 in stores)
    const pits = new Array<number>(MANCALA_TOTAL_PITS).fill(MANCALA_DEFAULT_SEEDS);
    pits[P1_STORE] = 0;
    pits[P2_STORE] = 0;

    return {
      players: [p1, p2],
      currentPlayerId: p1.id,
      scores: {
        [p1.id]: 0,
        [p2.id]: 0,
      },
      pits,
      variant: 'kalah-6',
      turnCount: 0,
      history: [],
      isGameOver: false,
    };
  }

  validateMove(
    state: MancalaState,
    move: MancalaMove,
    playerId: string,
    _nowMs?: number,
  ): GameValidationResult {
    if (this.isGameOver(state)) {
      return {
        ok: false,
        reason: 'GAME_OVER',
        message: 'The match is already over',
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
        message: 'Move payload must be an object',
      };
    }

    // Timeout forfeiture move
    if (move.type === 'timeout') {
      return { ok: true };
    }

    const pitIndex = (move as MancalaPitMove).pitIndex;
    if (typeof pitIndex !== 'number' || !Number.isInteger(pitIndex)) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'pitIndex must be a valid integer between 0 and 12',
      };
    }

    if (pitIndex === P1_STORE || pitIndex === P2_STORE) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Cannot sow seeds from a store',
      };
    }

    const [p1] = state.players;
    const isP1 = playerId === p1?.id;

    if (isP1) {
      if (pitIndex < 0 || pitIndex > 5) {
        return {
          ok: false,
          reason: 'INVALID_MOVE',
          message: 'Player 1 can only sow from pits 0 to 5',
        };
      }
    } else {
      if (pitIndex < 7 || pitIndex > 12) {
        return {
          ok: false,
          reason: 'INVALID_MOVE',
          message: 'Player 2 can only sow from pits 7 to 12',
        };
      }
    }

    const seedsInPit = state.pits[pitIndex] ?? 0;
    if (seedsInPit <= 0) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Cannot sow from an empty pit',
      };
    }

    return { ok: true };
  }

  applyMove(
    state: MancalaState,
    move: MancalaMove,
    playerId: string,
    _seed?: number,
    _nowMs?: number,
  ): MancalaState {
    const validation = this.validateMove(state, move, playerId);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const [p1, p2] = state.players;
    if (!p1 || !p2) {
      throw new Error('Corrupt state: players missing');
    }
    const isP1 = playerId === p1.id;
    const opponent = isP1 ? p2 : p1;

    // ── Timeout Handling ──────────────────────────────────────────────────
    if (move.type === 'timeout') {
      const pits = [...state.pits];
      const historyEntry: MancalaTurnHistory = {
        playerId,
        isTimeout: true,
      };

      return {
        ...state,
        pits,
        scores: {
          [p1.id]: pits[P1_STORE]!,
          [p2.id]: pits[P2_STORE]!,
        },
        turnCount: state.turnCount + 1,
        history: [...state.history, historyEntry],
        isGameOver: true,
      };
    }

    // ── Seed Sowing (Kalah Rules) ─────────────────────────────────────────
    const pits = [...state.pits];
    const pitIndex = (move as MancalaPitMove).pitIndex;
    let seeds = pits[pitIndex]!;
    pits[pitIndex] = 0;

    const ownStore = isP1 ? P1_STORE : P2_STORE;
    const oppStore = isP1 ? P2_STORE : P1_STORE;
    const ownPitsStart = isP1 ? 0 : 7;
    const ownPitsEnd = isP1 ? 5 : 12;

    let curr = pitIndex;
    const sowPath: number[] = [];

    while (seeds > 0) {
      curr = (curr + 1) % MANCALA_TOTAL_PITS;
      // Skip opponent's store
      if (curr === oppStore) {
        continue;
      }
      pits[curr]! += 1;
      sowPath.push(curr);
      seeds -= 1;
    }

    const lastPit = curr;
    let capturedSeeds = 0;

    // ── Opposite Pit Capture Rule ─────────────────────────────────────────
    // If last seed lands in an empty pit on active player's own side,
    // and opposite pit contains seeds: capture both into own store.
    if (
      lastPit >= ownPitsStart &&
      lastPit <= ownPitsEnd &&
      pits[lastPit] === 1 // Was empty before this seed landed
    ) {
      const oppPit = 12 - lastPit;
      const seedsInOppPit = pits[oppPit] ?? 0;
      if (seedsInOppPit > 0) {
        capturedSeeds = seedsInOppPit + 1;
        pits[oppPit] = 0;
        pits[lastPit] = 0;
        pits[ownStore]! += capturedSeeds;
      }
    }

    // ── Extra Turn Rule ───────────────────────────────────────────────────
    // If last seed landed in active player's own store, they get an extra turn.
    let grantedExtraTurn = false;
    let nextPlayerId = opponent.id;

    if (lastPit === ownStore) {
      grantedExtraTurn = true;
      nextPlayerId = playerId;
    }

    // ── Board Sweep & Game Over Check ─────────────────────────────────────
    // If either player's side is empty, the other player captures all remaining
    // seeds on their side, and the match concludes.
    const p1Empty = pits.slice(0, 6).every((s) => s === 0);
    const p2Empty = pits.slice(7, 13).every((s) => s === 0);
    let gameOver = false;

    if (p1Empty || p2Empty) {
      gameOver = true;
      // Sweep remaining Player 1 seeds into P1 store
      for (const idx of P1_PITS) {
        pits[P1_STORE]! += pits[idx]!;
        pits[idx] = 0;
      }
      // Sweep remaining Player 2 seeds into P2 store
      for (const idx of P2_PITS) {
        pits[P2_STORE]! += pits[idx]!;
        pits[idx] = 0;
      }
    }

    const nextScores = {
      [p1.id]: pits[P1_STORE]!,
      [p2.id]: pits[P2_STORE]!,
    };

    const historyEntry: MancalaTurnHistory = {
      playerId,
      pitIndex,
      seedsSown: sowPath.length,
      lastPit,
      capturedSeeds: capturedSeeds > 0 ? capturedSeeds : undefined,
      grantedExtraTurn,
    };

    return {
      ...state,
      pits,
      scores: nextScores,
      currentPlayerId: gameOver ? state.currentPlayerId : nextPlayerId,
      turnCount: state.turnCount + 1,
      history: [...state.history, historyEntry],
      lastSowPath: sowPath,
      isGameOver: gameOver,
    };
  }

  applyTimeout(
    state: MancalaState,
    expiredPlayerId: string,
    _seed?: number,
    _nowMs?: number,
  ): MancalaState {
    return this.applyMove(state, { type: 'timeout' }, expiredPlayerId);
  }

  /**
   * Project Player View (Fog-of-War / View Normalization):
   * Normalizes the board orientation so the viewing player's pits are always
   * rendered in `viewerSide` (bottom) and opponent's in `opponentSide` (top).
   */
  projectPlayerView(
    state: MancalaState,
    viewerPlayerId: string | null,
  ): ProjectedMancalaView {
    if (!state || !state.players || !Array.isArray(state.pits)) {
      return state as unknown as ProjectedMancalaView;
    }

    const [p1, p2] = state.players;
    const isP2Viewer = Boolean(p2 && viewerPlayerId === p2.id);

    if (isP2Viewer) {
      return {
        ...state,
        viewerSide: {
          pits: state.pits.slice(7, 13),
          store: state.pits[P2_STORE]!,
        },
        opponentSide: {
          pits: state.pits.slice(0, 6),
          store: state.pits[P1_STORE]!,
        },
        isViewerTurn: state.currentPlayerId === p2?.id,
      };
    }

    return {
      ...state,
      viewerSide: {
        pits: state.pits.slice(0, 6),
        store: state.pits[P1_STORE]!,
      },
      opponentSide: {
        pits: state.pits.slice(7, 13),
        store: state.pits[P2_STORE]!,
      },
      isViewerTurn: Boolean(p1 && viewerPlayerId === p1.id),
    };
  }

  getNextPlayer(state: MancalaState): string | null {
    if (this.isGameOver(state)) {
      return null;
    }
    return state.currentPlayerId;
  }

  isGameOver(state: MancalaState): boolean {
    if (state.isGameOver) {
      return true;
    }
    const p1Empty = state.pits.slice(0, 6).every((s) => s === 0);
    const p2Empty = state.pits.slice(7, 13).every((s) => s === 0);
    return p1Empty && p2Empty;
  }

  getResult(state: MancalaState): MancalaResult {
    const [p1, p2] = state.players;
    if (!p1 || !p2) {
      throw new Error('Invalid state for result calculation');
    }

    const last = state.history[state.history.length - 1];
    if (last?.isTimeout) {
      const winnerId = last.playerId === p1.id ? p2.id : p1.id;
      return {
        winnerId,
        scores: { ...state.scores },
        isDraw: false,
        isTimeout: true,
      };
    }

    const s1 = state.scores[p1.id] ?? 0;
    const s2 = state.scores[p2.id] ?? 0;

    if (s1 > s2) {
      return {
        winnerId: p1.id,
        scores: { ...state.scores },
        isDraw: false,
      };
    }

    if (s2 > s1) {
      return {
        winnerId: p2.id,
        scores: { ...state.scores },
        isDraw: false,
      };
    }

    return {
      winnerId: null,
      scores: { ...state.scores },
      isDraw: true,
    };
  }
}

export const mancalaGame = new MancalaRulesEngine();
