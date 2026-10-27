import type { GamePlayer } from '@recess/game-core';

export type WhotSuit = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';
export type WhotDeclaredSuit = Exclude<WhotSuit, 'whot'>;

export interface WhotCard {
  id: string; // Unique card identifier e.g. 'circle-1', 'whot-20-3'
  suit: WhotSuit;
  number: number; // 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14, 20
}

export type WhotMoveType = 'play' | 'draw' | 'timeout' | 'configure_rules';

export interface WhotPlayMove {
  type?: 'play' | undefined;
  cardId: string;
  declaredSuit?: WhotDeclaredSuit | undefined; // Mandatory when playing card 20
}

export interface WhotDrawMove {
  type: 'draw';
}

export interface WhotTimeoutMove {
  type: 'timeout';
}

export interface WhotConfigureRulesMove {
  type: 'configure_rules';
  houseRules: Partial<WhotHouseRules>;
}

export type WhotMove = WhotPlayMove | WhotDrawMove | WhotTimeoutMove | WhotConfigureRulesMove;

export type WhotSpecialAction =
  | 'hold_on' // Card 1 (or Card 7 when rule7Variant === 'hold_on')
  | 'pick_two' // Card 2 (or Card 7 when rule7Variant === 'pick_two')
  | 'pick_three' // Card 5 (Pick Three)
  | 'suspension' // Card 8
  | 'general_market' // Card 14
  | 'whot'; // Card 20

export interface WhotHouseRules {
  excludeWhot20: boolean; // Default: false. Removes all five '20' wild cards ("No 20s / Pure Skill")
  rule14GoGen: boolean; // Default: true. 14 = "Go Gen!" (General Market - opponent draws 1)
  rule2PickTwo: boolean; // Default: true. 2 = "Pick Two"
  rule5PickThree: boolean; // Default: true. 5 = "Pick Three"
  rule7Variant: 'none' | 'pick_two' | 'hold_on'; // Default: 'none'. Street rules: 7 = Pick Two OR 7 = Hold On/Cut!
  rule1HoldOn: boolean; // Default: true. 1 = "Hold On" (Play again)
  rule8Suspension: boolean; // Default: true. 8 = "Suspension" (Skip next player)
  allowPenaltyStacking: boolean; // Default: true ("Bombing": defend Pick 2 with a 2, or Pick 3 with a 5)
  allowWinOnSpecial: boolean; // Default: true. If false, cannot check up on an action card or 20
}

export type WhotRulePreset = 'naija_street' | 'pure_no_20' | 'campus_chaos' | 'custom';

export const WHOT_RULE_PRESETS: Record<WhotRulePreset, WhotHouseRules> = {
  naija_street: {
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
  pure_no_20: {
    excludeWhot20: true,
    rule14GoGen: true,
    rule2PickTwo: true,
    rule5PickThree: true,
    rule7Variant: 'pick_two',
    rule1HoldOn: true,
    rule8Suspension: true,
    allowPenaltyStacking: true,
    allowWinOnSpecial: false,
  },
  campus_chaos: {
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
  custom: {
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

export const DEFAULT_WHOT_HOUSE_RULES: WhotHouseRules = WHOT_RULE_PRESETS.naija_street;

export interface WhotTurnHistory {
  playerId: string;
  moveType: WhotMoveType;
  card?: WhotCard | undefined;
  declaredSuit?: WhotDeclaredSuit | undefined;
  drawnCardsCount?: number | undefined;
  specialAction?: WhotSpecialAction | undefined;
  callout?: string | undefined;
  timestampMs?: number | undefined;
}

export interface WhotState {
  players: GamePlayer[];
  currentPlayerId: string;
  hands: Record<string, WhotCard[]>;
  stockPile: WhotCard[];
  discardPile: WhotCard[];
  activeSuit: WhotDeclaredSuit;
  activeNumber: number;
  pendingDrawCount: number;
  lastPenaltyCardNumber?: number | undefined; // Records which penalty card (2, 5, or 7) triggered pendingDrawCount
  turnCount: number;
  history: WhotTurnHistory[];
  houseRules: WhotHouseRules;
  lastActionDescription?: string | undefined;
  isGameOver?: boolean | undefined;
  rngSeed?: number | undefined;
  rngStep?: number | undefined;
}

export interface WhotResult {
  winnerId: string | null;
  scores: Record<string, number>;
  isDraw: boolean;
  isTimeout?: boolean | undefined;
}

export interface ProjectedWhotPlayer {
  id: string;
  displayName: string;
  cardCount: number;
  cards?: WhotCard[] | undefined; // Only revealed to the owner!
}

export interface ProjectedWhotState {
  players: ProjectedWhotPlayer[];
  currentPlayerId: string;
  topDiscard: WhotCard | null;
  activeSuit: WhotDeclaredSuit | null;
  activeNumber: number | null;
  stockCount: number;
  pendingDrawCount: number;
  turnCount: number;
  history: WhotTurnHistory[];
  houseRules: WhotHouseRules;
  lastActionDescription?: string | undefined;
  isGameOver?: boolean | undefined;
  isViewerTurn?: boolean | undefined;
}

/**
 * Standard Naija Whot 54-card deck composition:
 * - Circles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14 (12 cards)
 * - Triangles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14 (12 cards)
 * - Crosses: 1, 2, 3, 5, 7, 10, 11, 13, 14 (9 cards)
 * - Squares: 1, 2, 3, 5, 7, 10, 11, 13, 14 (9 cards)
 * - Stars: 1, 2, 3, 4, 5, 7, 8 (7 cards)
 * - Whot: 20 (5 cards)
 * Total = 54 cards
 */
export const WHOT_DECK_SPEC: Record<WhotSuit, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
  whot: [20, 20, 20, 20, 20],
};

export const INITIAL_HAND_SIZE = 6;
