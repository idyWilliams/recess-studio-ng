import { describe, it, expect } from 'vitest';
import type { GamePlayer } from '@recess/game-core';
import {
  calculateCardPoints,
  calculateHandPoints,
  generateWhotDeck,
  WhotRulesEngine,
} from './whot.js';
import {
  DEFAULT_WHOT_HOUSE_RULES,
  type ProjectedWhotPlayer,
  type ProjectedWhotState,
  type WhotCard,
  type WhotDeclaredSuit,
  type WhotState,
} from './types.js';

const PLAYER_ONE: GamePlayer = { id: 'p1', displayName: 'Chidi' };
const PLAYER_TWO: GamePlayer = { id: 'p2', displayName: 'Tunde' };

describe('Whot! Naija Classic Engine (@recess/game-whot)', () => {
  const engine = new WhotRulesEngine();

  describe('Deck Generation & Scoring', () => {
    it('generates the standard 54-card Naija Whot deck', () => {
      const deck = generateWhotDeck();
      expect(deck).toHaveLength(54);

      const circles = deck.filter((c: WhotCard) => c.suit === 'circle');
      const triangles = deck.filter((c: WhotCard) => c.suit === 'triangle');
      const crosses = deck.filter((c: WhotCard) => c.suit === 'cross');
      const squares = deck.filter((c: WhotCard) => c.suit === 'square');
      const stars = deck.filter((c: WhotCard) => c.suit === 'star');
      const whots = deck.filter((c: WhotCard) => c.suit === 'whot');

      expect(circles).toHaveLength(12);
      expect(triangles).toHaveLength(12);
      expect(crosses).toHaveLength(9);
      expect(squares).toHaveLength(9);
      expect(stars).toHaveLength(7);
      expect(whots).toHaveLength(5);
    });

    it('correctly calculates card points with Star doubling and Whot 20 pts', () => {
      expect(calculateCardPoints({ id: 'c1', suit: 'circle', number: 7 })).toBe(7);
      expect(calculateCardPoints({ id: 's5', suit: 'star', number: 5 })).toBe(10); // 5 * 2
      expect(calculateCardPoints({ id: 's8', suit: 'star', number: 8 })).toBe(16); // 8 * 2
      expect(calculateCardPoints({ id: 'w20', suit: 'whot', number: 20 })).toBe(20);

      const hand: WhotCard[] = [
        { id: 'c1', suit: 'circle', number: 3 },
        { id: 's2', suit: 'star', number: 4 }, // 8
        { id: 'w3', suit: 'whot', number: 20 }, // 20
      ];
      expect(calculateHandPoints(hand)).toBe(31);
    });
  });

  describe('Initial State Setup', () => {
    it('deals 6 cards per player and establishes discard and stock piles', () => {
      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO], { seed: 42 });

      expect(state.players).toHaveLength(2);
      expect(state.currentPlayerId).toBe('p1');
      expect(state.hands['p1']).toHaveLength(6);
      expect(state.hands['p2']).toHaveLength(6);
      expect(state.discardPile).toHaveLength(1);
      expect(state.stockPile).toHaveLength(54 - 12 - 1); // 41 cards
      expect(state.pendingDrawCount).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.activeSuit).toBeDefined();
      expect(state.activeNumber).toBeDefined();
    });

    it('rejects games with fewer than 2 or more than 4 players', () => {
      expect(() => engine.createInitialState([PLAYER_ONE])).toThrow(
        /requires 2 to 4 players/,
      );
    });
  });

  describe('Move Validation', () => {
    function createCustomState(p1Cards: WhotCard[], topDiscard: WhotCard): WhotState {
      return {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: p1Cards,
          p2: [{ id: 'p2-1', suit: 'triangle', number: 5 }],
        },
        stockPile: [{ id: 'stk-1', suit: 'square', number: 3 }],
        discardPile: [topDiscard],
        activeSuit:
          topDiscard.suit === 'whot' ? 'circle' : (topDiscard.suit as WhotDeclaredSuit),
        activeNumber: topDiscard.number,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };
    }

    it('rejects moves when submitted out of turn', () => {
      const state = createCustomState(
        [{ id: 'c1', suit: 'circle', number: 7 }],
        { id: 'c2', suit: 'circle', number: 5 },
      );
      const validation = engine.validateMove(state, { cardId: 'c1' }, 'p2');
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.reason).toBe('NOT_YOUR_TURN');
      }
    });

    it('rejects moves if card is not in player hand', () => {
      const state = createCustomState(
        [{ id: 'c1', suit: 'circle', number: 7 }],
        { id: 'c2', suit: 'circle', number: 5 },
      );
      const validation = engine.validateMove(state, { cardId: 'non-existent' }, 'p1');
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.reason).toBe('INVALID_MOVE');
      }
    });

    it('allows matching by suit or matching by number', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'circle', number: 7 };

      // Matches suit (circle)
      const state1 = createCustomState(
        [{ id: 'c1', suit: 'circle', number: 4 }],
        topDiscard,
      );
      expect(engine.validateMove(state1, { cardId: 'c1' }, 'p1').ok).toBe(true);

      // Matches number (7)
      const state2 = createCustomState(
        [{ id: 't1', suit: 'triangle', number: 7 }],
        topDiscard,
      );
      expect(engine.validateMove(state2, { cardId: 't1' }, 'p1').ok).toBe(true);

      // Neither matches
      const state3 = createCustomState(
        [{ id: 'sq1', suit: 'square', number: 10 }],
        topDiscard,
      );
      const val3 = engine.validateMove(state3, { cardId: 'sq1' }, 'p1');
      expect(val3.ok).toBe(false);
    });

    it('validates Card 20 Whot wild card declaration', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'cross', number: 11 };
      const whotCard: WhotCard = { id: 'w20', suit: 'whot', number: 20 };
      const state = createCustomState([whotCard], topDiscard);

      // Missing declared suit
      const val1 = engine.validateMove(state, { cardId: 'w20' }, 'p1');
      expect(val1.ok).toBe(false);

      // Valid declared suit
      const val2 = engine.validateMove(
        state,
        { cardId: 'w20', declaredSuit: 'star' },
        'p1',
      );
      expect(val2.ok).toBe(true);
    });

    it('enforces defense or market draw when pendingDrawCount > 0', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'circle', number: 2 };
      const card5: WhotCard = { id: 'c5', suit: 'circle', number: 5 };
      const card2: WhotCard = { id: 't2', suit: 'triangle', number: 2 };

      const state: WhotState = {
        ...createCustomState([card5, card2], topDiscard),
        pendingDrawCount: 2,
      };

      // Playing a non-2 card while penalty is pending is illegal
      const valNon2 = engine.validateMove(state, { cardId: 'c5' }, 'p1');
      expect(valNon2.ok).toBe(false);

      // Defending with another 2 is legal!
      const val2 = engine.validateMove(state, { cardId: 't2' }, 'p1');
      expect(val2.ok).toBe(true);

      // Drawing from market is legal!
      const valDraw = engine.validateMove(state, { type: 'draw' }, 'p1');
      expect(valDraw.ok).toBe(true);
    });
  });

  describe('Gameplay Actions & Special Cards', () => {
    it('applies standard move and advances turn to opponent', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'circle', number: 5 };
      const playCard: WhotCard = { id: 'c1', suit: 'circle', number: 7 };

      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [playCard, { id: 'extra', suit: 'star', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'triangle', number: 7 }],
        },
        stockPile: [],
        discardPile: [topDiscard],
        activeSuit: 'circle',
        activeNumber: 5,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };

      const nextState = engine.applyMove(state, { cardId: 'c1' }, 'p1');
      expect(nextState.currentPlayerId).toBe('p2');
      expect(nextState.activeSuit).toBe('circle');
      expect(nextState.activeNumber).toBe(7);
      expect(nextState.hands['p1']).toHaveLength(1);
      expect(nextState.discardPile).toHaveLength(2);
      expect(nextState.discardPile[nextState.discardPile.length - 1]?.id).toBe('c1');
    });

    it('Card 1 (Hold On) keeps turn with the same player', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'square', number: 5 };
      const holdOnCard: WhotCard = { id: 'sq1', suit: 'square', number: 1 };

      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [holdOnCard, { id: 'c4', suit: 'circle', number: 4 }],
          p2: [{ id: 'p2-1', suit: 'triangle', number: 7 }],
        },
        stockPile: [],
        discardPile: [topDiscard],
        activeSuit: 'square',
        activeNumber: 5,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };

      const nextState = engine.applyMove(state, { cardId: 'sq1' }, 'p1');
      expect(nextState.currentPlayerId).toBe('p1'); // Still Player 1!
      expect(nextState.history[0]?.specialAction).toBe('hold_on');
    });

    it('Card 2 (Pick Two) accumulates pendingDrawCount and passes turn', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'triangle', number: 10 };
      const pickTwoCard: WhotCard = { id: 't2', suit: 'triangle', number: 2 };

      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [pickTwoCard, { id: 'extra', suit: 'star', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'circle', number: 7 }],
        },
        stockPile: [
          { id: 's1', suit: 'square', number: 5 },
          { id: 's2', suit: 'square', number: 7 },
        ],
        discardPile: [topDiscard],
        activeSuit: 'triangle',
        activeNumber: 10,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };

      const nextState = engine.applyMove(state, { cardId: 't2' }, 'p1');
      expect(nextState.currentPlayerId).toBe('p2');
      expect(nextState.pendingDrawCount).toBe(2);

      // Player 2 draws to resolve penalty
      const resolvedState = engine.applyMove(nextState, { type: 'draw' }, 'p2');
      expect(resolvedState.hands['p2']).toHaveLength(3); // 1 initial + 2 drawn
      expect(resolvedState.pendingDrawCount).toBe(0);
      expect(resolvedState.currentPlayerId).toBe('p1');
    });

    it('Card 8 (Suspension) skips the opponent turn in a 2-player match', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'cross', number: 3 };
      const suspensionCard: WhotCard = { id: 'cr8', suit: 'cross', number: 8 };

      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [suspensionCard, { id: 'extra', suit: 'star', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'triangle', number: 7 }],
        },
        stockPile: [],
        discardPile: [topDiscard],
        activeSuit: 'cross',
        activeNumber: 3,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };

      const nextState = engine.applyMove(state, { cardId: 'cr8' }, 'p1');
      expect(nextState.currentPlayerId).toBe('p1'); // Opponent skipped, player 1 plays again
      expect(nextState.history[0]?.specialAction).toBe('suspension');
    });

    it('Card 14 (General Market) forces all opponents to draw 1 card', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'circle', number: 10 };
      const gmCard: WhotCard = { id: 'c14', suit: 'circle', number: 14 };

      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [gmCard, { id: 'extra', suit: 'star', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'triangle', number: 7 }],
        },
        stockPile: [{ id: 'market-1', suit: 'square', number: 1 }],
        discardPile: [topDiscard],
        activeSuit: 'circle',
        activeNumber: 10,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };

      const nextState = engine.applyMove(state, { cardId: 'c14' }, 'p1');
      expect(nextState.hands['p2']).toHaveLength(2); // Drew 1 card from General Market
      expect(nextState.history[0]?.specialAction).toBe('general_market');
      expect(nextState.currentPlayerId).toBe('p2');
    });

    it('Card 20 (Whot) updates activeSuit to declared suit', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'circle', number: 4 };
      const whotCard: WhotCard = { id: 'w20', suit: 'whot', number: 20 };

      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [whotCard, { id: 'extra', suit: 'triangle', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'triangle', number: 7 }],
        },
        stockPile: [],
        discardPile: [topDiscard],
        activeSuit: 'circle',
        activeNumber: 4,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };

      const nextState = engine.applyMove(
        state,
        { cardId: 'w20', declaredSuit: 'star' },
        'p1',
      );
      expect(nextState.activeSuit).toBe('star');
      expect(nextState.activeNumber).toBe(20);
      expect(nextState.currentPlayerId).toBe('p2');
    });

    it('triggers game over when a player plays their last card (Check!)', () => {
      const topDiscard: WhotCard = { id: 'top', suit: 'circle', number: 5 };
      const winningCard: WhotCard = { id: 'c5', suit: 'circle', number: 5 };

      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [winningCard], // Only 1 card left!
          p2: [{ id: 'p2-1', suit: 'triangle', number: 7 }],
        },
        stockPile: [],
        discardPile: [topDiscard],
        activeSuit: 'circle',
        activeNumber: 5,
        pendingDrawCount: 0,
        turnCount: 0,
        history: [],
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        isGameOver: false,
      };

      const nextState = engine.applyMove(state, { cardId: 'c5' }, 'p1');
      expect(nextState.isGameOver).toBe(true);
      expect(engine.isGameOver(nextState)).toBe(true);

      const result = engine.getResult(nextState);
      expect(result.winnerId).toBe('p1');
      expect(result.scores['p1']).toBe(0);
      expect(result.scores['p2']).toBe(7);
      expect(result.isDraw).toBe(false);
    });

    it('handles timeout forfeiture cleanly', () => {
      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO]);
      const timedOutState = engine.applyTimeout(state, 'p1');

      expect(timedOutState.isGameOver).toBe(true);
      const result = engine.getResult(timedOutState);
      expect(result.winnerId).toBe('p2');
      expect(result.isTimeout).toBe(true);
    });
  });

  describe('Fog-of-War Projection (projectPlayerView)', () => {
    it('reveals viewer cards and masks opponent hand details while stripping seeds', () => {
      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO], { seed: 999 });
      const projected = engine.projectPlayerView(state, 'p1') as ProjectedWhotState;

      expect(projected.currentPlayerId).toBe('p1');
      expect(projected.isViewerTurn).toBe(true);
      expect(projected.topDiscard).toBeDefined();

      const p1View = projected.players.find((p: ProjectedWhotPlayer) => p.id === 'p1');
      const p2View = projected.players.find((p: ProjectedWhotPlayer) => p.id === 'p2');

      // Viewer p1 sees their full hand
      expect(p1View?.cards).toBeDefined();
      expect(p1View?.cards).toHaveLength(6);

      // Opponent p2 hand cards are masked (undefined) but cardCount is visible
      expect(p2View?.cards).toBeUndefined();
      expect(p2View?.cardCount).toBe(6);

      // PRNG seed is stripped
      expect((projected as unknown as { rngSeed?: unknown }).rngSeed).toBeUndefined();
    });

    it('safely handles empty or waiting session state', () => {
      const emptyState = {} as any;
      const projected = engine.projectPlayerView(emptyState, 'p1');
      expect(projected).toEqual({});
    });
  });

  describe('Authentic Naija Whot House Rules', () => {
    it('removes all 20 cards from deck when excludeWhot20 is true (49 cards total)', () => {
      const deck = generateWhotDeck(true);
      expect(deck).toHaveLength(49);
      expect(deck.some((c) => c.suit === 'whot' || c.number === 20)).toBe(false);

      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO], {
        houseRules: { excludeWhot20: true },
      });
      expect(state.houseRules.excludeWhot20).toBe(true);
      const allCards = [
        ...state.stockPile,
        ...state.discardPile,
        ...state.hands['p1']!,
        ...state.hands['p2']!,
      ];
      expect(allCards).toHaveLength(49);
      expect(allCards.some((c) => c.suit === 'whot')).toBe(false);
    });

    it('rule7Variant: pick_two applies a 2-card draw penalty', () => {
      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [{ id: 'c7', suit: 'circle', number: 7 }, { id: 'extra', suit: 'star', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'circle', number: 4 }],
        },
        stockPile: [
          { id: 'stk1', suit: 'cross', number: 1 },
          { id: 'stk2', suit: 'cross', number: 2 },
        ],
        discardPile: [{ id: 'top', suit: 'circle', number: 1 }],
        activeSuit: 'circle',
        activeNumber: 1,
        pendingDrawCount: 0,
        turnCount: 1,
        history: [],
        isGameOver: false,
        houseRules: {
          excludeWhot20: false,
          rule14GoGen: true,
          rule2PickTwo: true,
          rule5PickThree: true,
          rule7Variant: 'pick_two',
          rule1HoldOn: true,
          rule8Suspension: true,
          allowPenaltyStacking: true,
          allowWinOnSpecial: true,
        },
      };

      const nextState = engine.applyMove(state, { cardId: 'c7' }, 'p1');
      expect(nextState.currentPlayerId).toBe('p2');
      expect(nextState.pendingDrawCount).toBe(2);
      expect(nextState.history[0]?.specialAction).toBe('pick_two');
      expect(nextState.lastActionDescription).toContain('STREET SEVEN');
    });

    it('rule7Variant: hold_on grants an extra turn', () => {
      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [{ id: 'c7', suit: 'circle', number: 7 }, { id: 'extra', suit: 'star', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'circle', number: 4 }],
        },
        stockPile: [],
        discardPile: [{ id: 'top', suit: 'circle', number: 1 }],
        activeSuit: 'circle',
        activeNumber: 1,
        pendingDrawCount: 0,
        turnCount: 1,
        history: [],
        isGameOver: false,
        houseRules: {
          excludeWhot20: false,
          rule14GoGen: true,
          rule2PickTwo: true,
          rule5PickThree: true,
          rule7Variant: 'hold_on',
          rule1HoldOn: true,
          rule8Suspension: true,
          allowPenaltyStacking: true,
          allowWinOnSpecial: true,
        },
      };

      const nextState = engine.applyMove(state, { cardId: 'c7' }, 'p1');
      expect(nextState.currentPlayerId).toBe('p1'); // Turn retained!
      expect(nextState.history[0]?.specialAction).toBe('hold_on');
      expect(nextState.lastActionDescription).toContain('SEVEN CUT');
    });

    it('rule14GoGen: true triggers General Market for opponent', () => {
      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [{ id: 'c14', suit: 'circle', number: 14 }, { id: 'extra', suit: 'star', number: 3 }],
          p2: [{ id: 'p2-1', suit: 'circle', number: 4 }],
        },
        stockPile: [{ id: 'stk1', suit: 'cross', number: 1 }],
        discardPile: [{ id: 'top', suit: 'circle', number: 1 }],
        activeSuit: 'circle',
        activeNumber: 1,
        pendingDrawCount: 0,
        turnCount: 1,
        history: [],
        isGameOver: false,
        houseRules: {
          excludeWhot20: false,
          rule14GoGen: true,
          rule2PickTwo: true,
          rule5PickThree: true,
          rule7Variant: 'none',
          rule1HoldOn: true,
          rule8Suspension: true,
          allowPenaltyStacking: true,
          allowWinOnSpecial: true,
        },
      };

      const nextState = engine.applyMove(state, { cardId: 'c14' }, 'p1');
      expect(nextState.currentPlayerId).toBe('p2');
      expect(nextState.hands['p2']).toHaveLength(2); // Drew 1 card!
      expect(nextState.history[0]?.specialAction).toBe('general_market');
      expect(nextState.lastActionDescription).toContain('GO GEN');
    });

    it('allowPenaltyStacking: false prevents stacking a 2 on an active Pick Two penalty', () => {
      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p2',
        hands: {
          p1: [{ id: 'p1-1', suit: 'star', number: 3 }],
          p2: [{ id: 't2', suit: 'triangle', number: 2 }],
        },
        stockPile: [
          { id: 'stk1', suit: 'cross', number: 1 },
          { id: 'stk2', suit: 'cross', number: 2 },
        ],
        discardPile: [{ id: 'top', suit: 'circle', number: 2 }],
        activeSuit: 'circle',
        activeNumber: 2,
        pendingDrawCount: 2,
        turnCount: 2,
        history: [],
        isGameOver: false,
        houseRules: {
          excludeWhot20: false,
          rule14GoGen: true,
          rule2PickTwo: true,
          rule5PickThree: true,
          rule7Variant: 'none',
          rule1HoldOn: true,
          rule8Suspension: true,
          allowPenaltyStacking: false, // STACKING FORBIDDEN
          allowWinOnSpecial: true,
        },
      };

      // When stacking is false, trying to defend with card 2 must fail validation
      const validation = engine.validateMove(state, { cardId: 't2' }, 'p2');
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.reason).toBe('INVALID_MOVE');
      }

      // Must draw
      const drawValidation = engine.validateMove(state, { type: 'draw' }, 'p2');
      expect(drawValidation.ok).toBe(true);
    });

    it('allowWinOnSpecial: false prevents checking up on a special card and forces a market draw', () => {
      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [{ id: 'c2', suit: 'circle', number: 2 }], // Last card is a Pick 2
          p2: [{ id: 'p2-1', suit: 'circle', number: 4 }],
        },
        stockPile: [{ id: 'stk1', suit: 'star', number: 5 }],
        discardPile: [{ id: 'top', suit: 'circle', number: 1 }],
        activeSuit: 'circle',
        activeNumber: 1,
        pendingDrawCount: 0,
        turnCount: 3,
        history: [],
        isGameOver: false,
        houseRules: {
          excludeWhot20: false,
          rule14GoGen: true,
          rule2PickTwo: true,
          rule5PickThree: true,
          rule7Variant: 'none',
          rule1HoldOn: true,
          rule8Suspension: true,
          allowPenaltyStacking: true,
          allowWinOnSpecial: false, // FORBID WIN ON SPECIAL
        },
      };

      const nextState = engine.applyMove(state, { cardId: 'c2' }, 'p1');
      expect(nextState.isGameOver).toBe(false); // Game NOT over!
      expect(nextState.hands['p1']).toHaveLength(1); // Forced to draw 1 card
      expect(nextState.lastActionDescription).toContain('Cannot check up on a power card');
    });

    it('supports CONFIGURE_RULES before match begins', () => {
      const state = engine.createInitialState([PLAYER_ONE, PLAYER_TWO]);
      expect(state.turnCount).toBe(0);

      const configured = engine.applyMove(
        state,
        {
          type: 'configure_rules',
          houseRules: {
            excludeWhot20: true,
            rule7Variant: 'pick_two',
          },
        },
        'p1',
      );

      expect(configured.houseRules.excludeWhot20).toBe(true);
      expect(configured.houseRules.rule7Variant).toBe('pick_two');
    });

    it('retains turn for bot on Hold On (Card 1) allowing consecutive moves', () => {
      const state: WhotState = {
        players: [PLAYER_ONE, PLAYER_TWO],
        currentPlayerId: 'p1',
        hands: {
          p1: [
            { id: 'c1', suit: 'circle', number: 1 },
            { id: 'c5', suit: 'circle', number: 5 },
            { id: 'c3', suit: 'circle', number: 3 },
          ],
          p2: [{ id: 't4', suit: 'triangle', number: 4 }],
        },
        stockPile: [{ id: 's1', suit: 'star', number: 1 }],
        discardPile: [{ id: 'c4', suit: 'circle', number: 4 }],
        activeSuit: 'circle',
        activeNumber: 4,
        pendingDrawCount: 0,
        turnCount: 2,
        isGameOver: false,
        houseRules: { ...DEFAULT_WHOT_HOUSE_RULES },
        history: [],
      };

      // Player 1 plays Card 1 (Hold On)
      const afterHoldOn = engine.applyMove(state, { type: 'play', cardId: 'c1' }, 'p1');

      // Turn must remain with p1!
      expect(afterHoldOn.currentPlayerId).toBe('p1');
      expect(afterHoldOn.activeNumber).toBe(1);

      // Player 1 plays consecutive card (Circle 5)
      const afterSecondPlay = engine.applyMove(afterHoldOn, { type: 'play', cardId: 'c5' }, 'p1');
      expect(afterSecondPlay.currentPlayerId).toBe('p2');
    });
  });
});
