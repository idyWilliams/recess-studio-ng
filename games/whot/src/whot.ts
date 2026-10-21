import type {
  GameCartridge,
  GameInitContext,
  GamePlayer,
  GameValidationResult,
} from '@recess/game-core';

import { WHOT_GAME_ID, whotMeta } from './meta.js';
import {
  INITIAL_HAND_SIZE,
  WHOT_DECK_SPEC,
  type ProjectedWhotPlayer,
  type ProjectedWhotState,
  type WhotCard,
  type WhotDeclaredSuit,
  type WhotMove,
  type WhotPlayMove,
  type WhotResult,
  type WhotSpecialAction,
  type WhotState,
  type WhotSuit,
  type WhotTurnHistory,
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

/**
 * Generates the full 54-card Naija Whot deck.
 */
export function generateWhotDeck(): WhotCard[] {
  const deck: WhotCard[] = [];
  const suits = Object.keys(WHOT_DECK_SPEC) as WhotSuit[];

  for (const suit of suits) {
    const numbers = WHOT_DECK_SPEC[suit];
    numbers.forEach((num, idx) => {
      deck.push({
        id: `${suit}-${num}-${idx + 1}`,
        suit,
        number: num,
      });
    });
  }

  return deck;
}

/**
 * Fisher-Yates deterministic shuffle using Mulberry32.
 */
export function shuffleDeck(deck: WhotCard[], seed: number, startStep: number): { shuffled: WhotCard[]; nextStep: number } {
  const result = [...deck];
  let step = startStep;

  for (let i = result.length - 1; i > 0; i--) {
    const rand = mulberry32(seed, step++);
    const j = Math.floor(rand * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }

  return { shuffled: result, nextStep: step };
}

/**
 * Calculates penalty/hand points for end-game evaluation.
 * - Star cards count as double their face value (e.g. Star 7 = 14 pts)
 * - Whot 20 counts as 20 pts
 * - All other suits count as face value
 */
export function calculateCardPoints(card: WhotCard): number {
  if (card.suit === 'star') {
    return card.number * 2;
  }
  if (card.suit === 'whot' || card.number === 20) {
    return 20;
  }
  return card.number;
}

export function calculateHandPoints(cards: WhotCard[]): number {
  return cards.reduce((sum, c) => sum + calculateCardPoints(c), 0);
}

export class WhotRulesEngine implements GameCartridge<WhotState, WhotMove, WhotResult> {
  readonly id = WHOT_GAME_ID;
  readonly gameId = WHOT_GAME_ID;
  readonly name = 'Whot! Naija Classic';
  readonly version = '1.0.0';
  readonly minPlayers = 2;
  readonly maxPlayers = 4;
  readonly metadata = whotMeta;

  createInitialState(
    contextOrPlayers: GamePlayer[] | GameInitContext,
    options?: { seed?: number; [key: string]: unknown },
  ): WhotState {
    const players = Array.isArray(contextOrPlayers)
      ? contextOrPlayers
      : contextOrPlayers.players;

    if (!players || players.length < 2 || players.length > 4) {
      throw new Error('Whot! requires 2 to 4 players');
    }

    const seed =
      (typeof contextOrPlayers === 'object' && !Array.isArray(contextOrPlayers) && contextOrPlayers.seed) ||
      options?.seed ||
      1337;

    const baseDeck = generateWhotDeck();
    const { shuffled, nextStep } = shuffleDeck(baseDeck, seed, 0);

    const hands: Record<string, WhotCard[]> = {};
    let deckIndex = 0;

    // Deal cards to each player
    for (const player of players) {
      hands[player.id] = shuffled.slice(deckIndex, deckIndex + INITIAL_HAND_SIZE);
      deckIndex += INITIAL_HAND_SIZE;
    }

    // Flip the first card to start the discard pile (must not be an action card if possible)
    let firstCard = shuffled[deckIndex++]!;
    const stockPile = shuffled.slice(deckIndex);

    // Initial active suit and number
    const activeSuit: WhotDeclaredSuit =
      firstCard.suit === 'whot' ? 'circle' : (firstCard.suit as WhotDeclaredSuit);
    const activeNumber = firstCard.number;

    return {
      players,
      currentPlayerId: players[0]!.id,
      hands,
      stockPile,
      discardPile: [firstCard],
      activeSuit,
      activeNumber,
      pendingDrawCount: 0,
      turnCount: 0,
      history: [],
      isGameOver: false,
      rngSeed: seed,
      rngStep: nextStep,
    };
  }

  validateMove(
    state: WhotState,
    move: WhotMove,
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

    // Timeout forfeiture
    if (move.type === 'timeout') {
      return { ok: true };
    }

    // Draw from market
    if (move.type === 'draw') {
      return { ok: true };
    }

    // Play card
    const playMove = move as WhotPlayMove;
    if (!playMove.cardId) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Missing cardId in play move',
      };
    }

    const playerHand = state.hands[playerId];
    if (!playerHand) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Player hand not found',
      };
    }

    const card = playerHand.find((c) => c.id === playMove.cardId);
    if (!card) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: 'Card not in player hand',
      };
    }

    // Pending penalty defense check (e.g. Pick Two)
    if (state.pendingDrawCount > 0) {
      // Under pending penalty, only another Card 2 can defend!
      if (card.number !== 2) {
        return {
          ok: false,
          reason: 'INVALID_MOVE',
          message: `Cannot play non-2 card while ${state.pendingDrawCount} cards are pending. You must defend with a 2 or draw from market.`,
        };
      }
      return { ok: true };
    }

    // Wild Whot 20 card
    if (card.suit === 'whot' || card.number === 20) {
      if (!playMove.declaredSuit) {
        return {
          ok: false,
          reason: 'INVALID_MOVE',
          message: 'Must declare a suit when playing Card 20 (Whot)',
        };
      }
      const validSuits: WhotDeclaredSuit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
      if (!validSuits.includes(playMove.declaredSuit)) {
        return {
          ok: false,
          reason: 'INVALID_MOVE',
          message: `Declared suit must be one of: ${validSuits.join(', ')}`,
        };
      }
      return { ok: true };
    }

    // Standard card: must match active suit or active number
    const matchesSuit = card.suit === state.activeSuit;
    const matchesNumber = card.number === state.activeNumber;

    if (!matchesSuit && !matchesNumber) {
      return {
        ok: false,
        reason: 'INVALID_MOVE',
        message: `Card does not match active suit (${state.activeSuit}) or number (${state.activeNumber})`,
      };
    }

    return { ok: true };
  }

  applyMove(
    state: WhotState,
    move: WhotMove,
    playerId: string,
    seed?: number,
    nowMs?: number,
  ): WhotState {
    const validation = this.validateMove(state, move, playerId, nowMs);
    if (!validation.ok) {
      throw new Error(`Illegal Whot! move: ${validation.message}`);
    }

    const s: WhotState = {
      ...state,
      hands: { ...state.hands },
      stockPile: [...state.stockPile],
      discardPile: [...state.discardPile],
      history: [...state.history],
      rngSeed: seed ?? state.rngSeed ?? 1337,
      rngStep: state.rngStep ?? 0,
    };

    // Timeout move
    if (move.type === 'timeout') {
      s.isGameOver = true;
      s.history.push({
        playerId,
        moveType: 'timeout',
        timestampMs: nowMs,
      });
      return s;
    }

    // Draw move
    if (move.type === 'draw') {
      const drawCount = s.pendingDrawCount > 0 ? s.pendingDrawCount : 1;
      s.pendingDrawCount = 0;

      const drawnCards = this.drawFromStock(s, drawCount);
      s.hands[playerId] = [...(s.hands[playerId] ?? []), ...drawnCards];

      s.history.push({
        playerId,
        moveType: 'draw',
        drawnCardsCount: drawnCards.length,
        timestampMs: nowMs,
      });

      s.currentPlayerId = this.getNextPlayerIndex(s, playerId, 1);
      s.turnCount++;
      return s;
    }

    // Play move
    const playMove = move as WhotPlayMove;
    const playerHand = [...(s.hands[playerId] ?? [])];
    const cardIndex = playerHand.findIndex((c) => c.id === playMove.cardId);
    const card = playerHand[cardIndex]!;

    // Remove card from player hand and place on discard pile
    playerHand.splice(cardIndex, 1);
    s.hands[playerId] = playerHand;
    s.discardPile.push(card);

    let specialAction: WhotSpecialAction | undefined;

    // Action Card Logic
    if (card.suit === 'whot' || card.number === 20) {
      specialAction = 'whot';
      s.activeSuit = playMove.declaredSuit!;
      s.activeNumber = 20;
    } else {
      s.activeSuit = card.suit as WhotDeclaredSuit;
      s.activeNumber = card.number;

      if (card.number === 1) {
        specialAction = 'hold_on';
      } else if (card.number === 2) {
        specialAction = 'pick_two';
        s.pendingDrawCount += 2;
      } else if (card.number === 8) {
        specialAction = 'suspension';
      } else if (card.number === 14) {
        specialAction = 'general_market';
        // Every other player draws 1 card
        for (const p of s.players) {
          if (p.id !== playerId) {
            const marketDrawn = this.drawFromStock(s, 1);
            s.hands[p.id] = [...(s.hands[p.id] ?? []), ...marketDrawn];
          }
        }
      }
    }

    s.history.push({
      playerId,
      moveType: 'play',
      card,
      declaredSuit: playMove.declaredSuit,
      specialAction,
      timestampMs: nowMs,
    });

    // Check if player won immediately (Hand empty)
    if (playerHand.length === 0) {
      s.isGameOver = true;
      s.turnCount++;
      return s;
    }

    // Determine next player based on action cards
    if (specialAction === 'hold_on') {
      // Same player plays again
      s.currentPlayerId = playerId;
    } else if (specialAction === 'suspension') {
      // Skips next player (advance by 2 steps)
      s.currentPlayerId = this.getNextPlayerIndex(s, playerId, 2);
    } else {
      // Normal advance to next player
      s.currentPlayerId = this.getNextPlayerIndex(s, playerId, 1);
    }

    s.turnCount++;
    return s;
  }

  applyTimeout(
    state: WhotState,
    expiredPlayerId: string,
    seed?: number,
    nowMs?: number,
  ): WhotState {
    return this.applyMove(state, { type: 'timeout' }, expiredPlayerId, seed, nowMs);
  }

  projectPlayerView(
    state: WhotState,
    viewerPlayerId: string | null,
  ): unknown {
    if (!state || !state.players || !Array.isArray(state.players) || !state.hands) {
      return state;
    }

    const topDiscard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1]! : null;

    const projectedPlayers: ProjectedWhotPlayer[] = state.players.map((p) => {
      const isViewer = viewerPlayerId === p.id;
      const hand = state.hands[p.id] ?? [];

      return {
        id: p.id,
        displayName: p.displayName,
        cardCount: hand.length,
        cards: isViewer ? hand : undefined,
      };
    });

    const projected: ProjectedWhotState = {
      players: projectedPlayers,
      currentPlayerId: state.currentPlayerId,
      topDiscard,
      activeSuit: state.activeSuit,
      activeNumber: state.activeNumber,
      stockCount: state.stockPile.length,
      pendingDrawCount: state.pendingDrawCount,
      turnCount: state.turnCount,
      history: state.history,
      isGameOver: state.isGameOver,
      isViewerTurn: viewerPlayerId === state.currentPlayerId,
    };

    return projected;
  }

  getNextPlayer(state: WhotState): string | null {
    if (this.isGameOver(state)) return null;
    return state.currentPlayerId;
  }

  isGameOver(state: WhotState): boolean {
    if (state.isGameOver) return true;
    for (const player of state.players) {
      if ((state.hands[player.id]?.length ?? 0) === 0) {
        return true;
      }
    }
    return false;
  }

  getResult(state: WhotState): WhotResult {
    const scores: Record<string, number> = {};
    for (const p of state.players) {
      scores[p.id] = calculateHandPoints(state.hands[p.id] ?? []);
    }

    // Check timeout history
    const lastHistory = state.history[state.history.length - 1];
    if (lastHistory?.moveType === 'timeout') {
      const timedOutPlayerId = lastHistory.playerId;
      const opponent = state.players.find((p) => p.id !== timedOutPlayerId);
      return {
        winnerId: opponent ? opponent.id : null,
        scores,
        isDraw: false,
        isTimeout: true,
      };
    }

    // Check if someone emptied their hand
    for (const p of state.players) {
      if ((state.hands[p.id]?.length ?? 0) === 0) {
        return {
          winnerId: p.id,
          scores,
          isDraw: false,
          isTimeout: false,
        };
      }
    }

    // Lowest points wins
    let lowestScore = Infinity;
    let winnerId: string | null = null;
    let isDraw = false;

    for (const p of state.players) {
      const score = scores[p.id] ?? 0;
      if (score < lowestScore) {
        lowestScore = score;
        winnerId = p.id;
        isDraw = false;
      } else if (score === lowestScore) {
        isDraw = true;
      }
    }

    return {
      winnerId: isDraw ? null : winnerId,
      scores,
      isDraw,
      isTimeout: false,
    };
  }

  /**
   * Helper to draw cards from stock, reshuffling discard pile if stock runs low.
   */
  private drawFromStock(state: WhotState, count: number): WhotCard[] {
    const drawn: WhotCard[] = [];

    for (let i = 0; i < count; i++) {
      if (state.stockPile.length === 0) {
        // Reshuffle discard pile (leaving top card)
        if (state.discardPile.length <= 1) {
          break; // No more cards available in market
        }
        const top = state.discardPile.pop()!;
        const toRecycle = [...state.discardPile];
        state.discardPile = [top];

        const { shuffled, nextStep } = shuffleDeck(toRecycle, state.rngSeed ?? 1337, state.rngStep ?? 0);
        state.stockPile = shuffled;
        state.rngStep = nextStep;
      }

      if (state.stockPile.length > 0) {
        drawn.push(state.stockPile.shift()!);
      }
    }

    return drawn;
  }

  private getNextPlayerIndex(state: WhotState, currentId: string, stepCount: number): string {
    const currentIndex = state.players.findIndex((p) => p.id === currentId);
    if (currentIndex === -1) return state.players[0]!.id;
    const nextIndex = (currentIndex + stepCount) % state.players.length;
    return state.players[nextIndex]!.id;
  }
}

export const whotGame = new WhotRulesEngine();
