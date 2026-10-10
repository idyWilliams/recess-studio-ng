/** Conceptual statistics models — not implemented in Phase 0. */

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  knockouts: number;
  currentStreak: number;
  bestStreak: number;
  rating: number;
}

export interface GameStats {
  gameId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  knockouts: number;
  currentStreak: number;
  bestStreak: number;
  rating: number;
}
