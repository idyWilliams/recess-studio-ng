import type {
  GameCartridge,
  GameInitContext,
  GamePlayer,
  GameValidationResult,
} from '@recess/game-core';

import { LUDO_GAME_ID, ludoMeta } from './meta.js';
import {
  HOME_STEP,
  LUDO_COLORS,
  SAFE_SQUARES,
  START_OFFSETS,
  TOTAL_TRACK_SQUARES,
  type LudoColor,
  type LudoMove,
  type LudoResult,
  type LudoState,
  type LudoToken,
  type LudoTokenMove,
  type ProjectedLudoState,
  type ProjectedLudoToken,
} from './types.js';

/**
 * Pure, deterministic Mulberry32 PRNG.
 */
export function mulberry32(seed: number, step: number): number {
  let s = (seed + step * 0x6d2b79f5) >>> 0;
  s = (s + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rollDie(seed: number, step: number): number {
  const rand = mulberry32(seed, step);
  return 1 + Math.floor(rand * 6);
}

export function getTrackSquare(color: LudoColor, step: number): number | null {
  if (step < 0 || step > 50) return null;
  return (START_OFFSETS[color] + step) % TOTAL_TRACK_SQUARES;
}

export function canTokenMove(token: LudoToken, roll: number): boolean {
  if (token.isHome) return false;
  if (token.step === -1) {
    return roll === 6;
  }
  return token.step + roll <= HOME_STEP;
}

export class LudoRulesEngine implements GameCartridge<LudoState, LudoMove, LudoResult> {
  readonly id = LUDO_GAME_ID;
  readonly gameId = LUDO_GAME_ID;
  readonly name = 'Ludo Arena';
  readonly version = '1.0.0';
  readonly minPlayers = 2;
  readonly maxPlayers = 4;
  readonly metadata = ludoMeta;

  createInitialState(
    contextOrPlayers: GamePlayer[] | GameInitContext,
    options?: { seed?: number; [key: string]: unknown },
  ): LudoState {
    const players = Array.isArray(contextOrPlayers)
      ? contextOrPlayers
      : contextOrPlayers.players;

    if (!players || players.length < 2 || players.length > 4) {
      throw new Error('Ludo Arena requires 2 to 4 players');
    }

    const seed =
      (typeof contextOrPlayers === 'object' && !Array.isArray(contextOrPlayers) && contextOrPlayers.seed) ||
      options?.seed ||
      4242;

    // Assign colors
    const playerColors: Record<string, LudoColor> = {};
    const colorPlayers: Record<LudoColor, string> = {} as any;

    if (players.length === 2) {
      // 2 players: Red vs Yellow (opposite sides)
      playerColors[players[0]!.id] = 'red';
      playerColors[players[1]!.id] = 'yellow';
      colorPlayers['red'] = players[0]!.id;
      colorPlayers['yellow'] = players[1]!.id;
    } else {
      players.forEach((p, idx) => {
        const color = LUDO_COLORS[idx]!;
        playerColors[p.id] = color;
        colorPlayers[color] = p.id;
      });
    }

    // Initialize 4 tokens per active color
    const tokens: Record<LudoColor, LudoToken[]> = {
      red: [],
      green: [],
      yellow: [],
      blue: [],
    };

    const activeColors = Object.values(playerColors);
    for (const color of activeColors) {
      tokens[color] = [0, 1, 2, 3].map((idx) => ({
        id: `${color}-${idx}`,
        color,
        index: idx,
        step: -1, // yard
        isHome: false,
      }));
    }

    const firstPlayer = players[0]!;
    const firstColor = playerColors[firstPlayer.id]!;

    return {
      players,
      playerColors,
      colorPlayers,
      tokens,
      currentPlayerId: firstPlayer.id,
      currentColor: firstColor,
      turnPhase: 'roll',
      diceRoll: null,
      consecutiveSixes: 0,
      turnCount: 0,
      history: [],
      isGameOver: false,
      winnerColor: null,
      rngSeed: seed,
      rngStep: 0,
    };
  }

  validateMove(
    state: LudoState,
    move: LudoMove,
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

    if (move.type === 'timeout') {
      return { ok: true };
    }

    if (move.type === 'roll') {
      if (state.turnPhase !== 'roll') {
        return {
          ok: false,
          reason: 'INVALID_MOVE',
          message: 'Die has already been rolled. Please select a token to move.',
        };
      }
      return { ok: true };
    }

    // Move token action
    if (state.turnPhase !== 'move' || state.diceRoll === null) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'You must roll the die before moving a token',
      };
    }

    const tokenMove = move as LudoTokenMove;
    const activeColorTokens = state.tokens[state.currentColor] ?? [];

    let targetToken: LudoToken | undefined;
    if (tokenMove.tokenId) {
      targetToken = activeColorTokens.find((t) => t.id === tokenMove.tokenId);
    } else if (tokenMove.tokenIndex !== undefined) {
      targetToken = activeColorTokens[tokenMove.tokenIndex];
    }

    if (!targetToken) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Token not found for current player',
      };
    }

    if (!canTokenMove(targetToken, state.diceRoll)) {
      if (targetToken.step === -1) {
        return {
          ok: false,
          reason: 'INVALID_MOVE',
          message: 'You must roll a 6 to leave the yard',
        };
      }
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Move exceeds the home square (exact roll required)',
      };
    }

    return { ok: true };
  }

  applyMove(
    state: LudoState,
    move: LudoMove,
    playerId: string,
    seed?: number,
    nowMs?: number,
  ): LudoState {
    const validation = this.validateMove(state, move, playerId, nowMs);
    if (!validation.ok) {
      throw new Error(`Illegal Ludo move: ${validation.message}`);
    }

    const s: LudoState = {
      ...state,
      tokens: {
        red: [...(state.tokens.red ?? [])],
        green: [...(state.tokens.green ?? [])],
        yellow: [...(state.tokens.yellow ?? [])],
        blue: [...(state.tokens.blue ?? [])],
      },
      history: [...state.history],
      rngSeed: seed ?? state.rngSeed ?? 4242,
      rngStep: state.rngStep ?? 0,
    };

    // Timeout forfeiture
    if (move.type === 'timeout') {
      s.isGameOver = true;
      s.history.push({
        playerId,
        color: s.currentColor,
        moveType: 'timeout',
        timestampMs: nowMs,
      });
      return s;
    }

    // Roll Phase
    if (move.type === 'roll') {
      const rolled = rollDie(s.rngSeed!, s.rngStep!);
      s.rngStep = (s.rngStep ?? 0) + 1;
      s.diceRoll = rolled;

      let consecutive = s.consecutiveSixes;
      if (rolled === 6) {
        consecutive++;
      } else {
        consecutive = 0;
      }
      s.consecutiveSixes = consecutive;

      s.history.push({
        playerId,
        color: s.currentColor,
        moveType: 'roll',
        diceRoll: rolled,
        timestampMs: nowMs,
      });

      // 3 consecutive sixes penalty rule: turn forfeited immediately
      if (consecutive === 3) {
        s.turnPhase = 'roll';
        s.diceRoll = null;
        s.consecutiveSixes = 0;
        this.advanceToNextPlayer(s);
        s.turnCount++;
        return s;
      }

      // Check if any token can move with this roll
      const activeTokens = s.tokens[s.currentColor] ?? [];
      const movableTokens = activeTokens.filter((t) => canTokenMove(t, rolled));

      if (movableTokens.length === 0) {
        // No legal move possible! Turn passes to next player
        s.turnPhase = 'roll';
        s.diceRoll = null;
        s.consecutiveSixes = 0;
        this.advanceToNextPlayer(s);
        s.turnCount++;
        return s;
      }

      // Tokens can move: advance to move phase
      s.turnPhase = 'move';
      return s;
    }

    // Move Phase
    const tokenMove = move as LudoTokenMove;
    const activeColorTokens = s.tokens[s.currentColor]!;
    const tokenIndex =
      tokenMove.tokenId !== undefined
        ? activeColorTokens.findIndex((t) => t.id === tokenMove.tokenId)
        : tokenMove.tokenIndex ?? 0;

    const token = { ...activeColorTokens[tokenIndex]! };
    const fromStep = token.step;
    const roll = s.diceRoll!;

    let toStep: number;
    if (fromStep === -1) {
      toStep = 0; // leaves yard to start track
    } else {
      toStep = fromStep + roll;
    }

    token.step = toStep;
    if (toStep === HOME_STEP) {
      token.isHome = true;
    }
    activeColorTokens[tokenIndex] = token;

    // Capture logic
    let capturedTokenId: string | undefined;
    let earnedBonusTurn = false;

    if (toStep >= 0 && toStep <= 50) {
      const destTrackSquare = getTrackSquare(s.currentColor, toStep);
      const isDestSafe = destTrackSquare !== null && SAFE_SQUARES.includes(destTrackSquare);

      if (!isDestSafe && destTrackSquare !== null) {
        // Check for opponent tokens on this square
        for (const [colorStr, cTokens] of Object.entries(s.tokens)) {
          const color = colorStr as LudoColor;
          if (color === s.currentColor) continue;

          for (let i = 0; i < cTokens.length; i++) {
            const oppToken = cTokens[i]!;
            if (oppToken.step >= 0 && oppToken.step <= 50) {
              const oppSquare = getTrackSquare(color, oppToken.step);
              if (oppSquare === destTrackSquare) {
                // CAPTURE! Return opponent token to yard
                cTokens[i] = {
                  ...oppToken,
                  step: -1,
                  isHome: false,
                };
                capturedTokenId = oppToken.id;
                earnedBonusTurn = true;
                break;
              }
            }
          }
          if (capturedTokenId) break;
        }
      }
    }

    // Extra turn on rolling 6, capturing an opponent, or reaching home
    if (roll === 6 || earnedBonusTurn || toStep === HOME_STEP) {
      s.turnPhase = 'roll';
      s.diceRoll = null;
      // Note: if earned by capture/home, player still gets another roll!
    } else {
      // Normal turn handover
      s.turnPhase = 'roll';
      s.diceRoll = null;
      s.consecutiveSixes = 0;
      this.advanceToNextPlayer(s);
    }

    s.history.push({
      playerId,
      color: s.currentColor,
      moveType: 'move',
      tokenId: token.id,
      fromStep,
      toStep,
      capturedTokenId,
      isExtraTurn: roll === 6 || earnedBonusTurn || toStep === HOME_STEP,
      timestampMs: nowMs,
    });

    // Check Victory Condition: All 4 tokens home
    const allHome = activeColorTokens.every((t) => t.isHome);
    if (allHome) {
      s.isGameOver = true;
      s.winnerColor = s.currentColor;
    }

    s.turnCount++;
    return s;
  }

  applyTimeout(
    state: LudoState,
    expiredPlayerId: string,
    seed?: number,
    nowMs?: number,
  ): LudoState {
    return this.applyMove(state, { type: 'timeout' }, expiredPlayerId, seed, nowMs);
  }

  projectPlayerView(
    state: LudoState,
    viewerPlayerId: string | null,
  ): unknown {
    if (!state || !state.players || !Array.isArray(state.players) || !state.tokens) {
      return state;
    }

    const projectedTokens: Record<LudoColor, ProjectedLudoToken[]> = {
      red: [],
      green: [],
      yellow: [],
      blue: [],
    };

    for (const [colorStr, tokenList] of Object.entries(state.tokens)) {
      const color = colorStr as LudoColor;
      projectedTokens[color] = (tokenList ?? []).map((t) => {
        const trackSquare = getTrackSquare(color, t.step);
        const isSafe = trackSquare !== null && SAFE_SQUARES.includes(trackSquare);
        return {
          ...t,
          trackSquare,
          isSafe,
        };
      });
    }

    // Compute legal token moves for active player
    const legalTokenMoves: string[] = [];
    if (state.turnPhase === 'move' && state.diceRoll !== null) {
      const activeTokens = state.tokens[state.currentColor] ?? [];
      for (const t of activeTokens) {
        if (canTokenMove(t, state.diceRoll)) {
          legalTokenMoves.push(t.id);
        }
      }
    }

    const projected: ProjectedLudoState = {
      players: state.players,
      playerColors: state.playerColors,
      tokens: projectedTokens,
      currentPlayerId: state.currentPlayerId,
      currentColor: state.currentColor,
      turnPhase: state.turnPhase,
      diceRoll: state.diceRoll,
      legalTokenMoves,
      turnCount: state.turnCount,
      history: state.history,
      isGameOver: state.isGameOver,
      winnerColor: state.winnerColor,
      isViewerTurn: viewerPlayerId === state.currentPlayerId,
    };

    return projected;
  }

  getNextPlayer(state: LudoState): string | null {
    if (this.isGameOver(state)) return null;
    return state.currentPlayerId;
  }

  isGameOver(state: LudoState): boolean {
    if (state.isGameOver) return true;
    for (const color of Object.keys(state.tokens) as LudoColor[]) {
      const tokenList = state.tokens[color];
      if (tokenList && tokenList.length === 4 && tokenList.every((t) => t.isHome)) {
        return true;
      }
    }
    return false;
  }

  getResult(state: LudoState): LudoResult {
    const tokensHome: Record<string, number> = {};
    for (const p of state.players) {
      const color = state.playerColors[p.id];
      if (color && state.tokens[color]) {
        tokensHome[p.id] = state.tokens[color]!.filter((t) => t.isHome).length;
      } else {
        tokensHome[p.id] = 0;
      }
    }

    // Check timeout
    const lastHistory = state.history[state.history.length - 1];
    if (lastHistory?.moveType === 'timeout') {
      const timedOutPlayerId = lastHistory.playerId;
      const opponent = state.players.find((p) => p.id !== timedOutPlayerId);
      const winnerColor = opponent ? state.playerColors[opponent.id] ?? null : null;
      return {
        winnerId: opponent ? opponent.id : null,
        winnerColor,
        tokensHome,
        isDraw: false,
        isTimeout: true,
      };
    }

    // Check winner
    if (state.winnerColor) {
      const winnerPlayerId = state.colorPlayers[state.winnerColor] ?? null;
      return {
        winnerId: winnerPlayerId,
        winnerColor: state.winnerColor,
        tokensHome,
        isDraw: false,
        isTimeout: false,
      };
    }

    for (const p of state.players) {
      const color = state.playerColors[p.id];
      if (color && state.tokens[color]?.every((t) => t.isHome)) {
        return {
          winnerId: p.id,
          winnerColor: color,
          tokensHome,
          isDraw: false,
          isTimeout: false,
        };
      }
    }

    return {
      winnerId: null,
      winnerColor: null,
      tokensHome,
      isDraw: false,
      isTimeout: false,
    };
  }

  private advanceToNextPlayer(state: LudoState): void {
    const currentIndex = state.players.findIndex((p) => p.id === state.currentPlayerId);
    const nextIndex = (currentIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextIndex]!;
    state.currentPlayerId = nextPlayer.id;
    state.currentColor = state.playerColors[nextPlayer.id]!;
  }
}

export const ludoGame = new LudoRulesEngine();
