import type { MatchStatusState, MatchupPlayer } from '@recess/ui';
import type {
  WordBattlePenaltyReason,
  WordBattleResult,
  WordBattleState,
} from '@recess/game-word-battle';

import type { WordBattleSession } from './api-client';

/**
 * Pure mapping from the server-authoritative Word Battle session to the values the UI
 * renders. No game rules are duplicated here: scores, lives, turn order, and history all
 * come straight from the confirmed server state; these helpers only re-shape them for
 * display and never re-compute game outcomes.
 */

export interface SessionPlayerView {
  userId: string;
  username: string;
  avatarUrl: string | null;
  seat: number;
}

/** Players in seat order (seat 0 = creator, seat 1 = joiner). */
export function getSessionPlayers(
  session: Pick<WordBattleSession, 'players'>,
): SessionPlayerView[] {
  return [...session.players]
    .map((player) => ({
      userId: player.userId,
      username: player.username,
      avatarUrl: player.avatarUrl ?? null,
      seat: Number(player.seat),
    }))
    .sort((a, b) => a.seat - b.seat);
}

/**
 * The live game state, or null while the session is still waiting (no board yet — the
 * server stores an empty placeholder state until the match starts).
 */
export function getWordBattleState(
  session: WordBattleSession,
): WordBattleState | null {
  if (session.status !== 'active' && session.status !== 'completed') {
    return null;
  }
  return session.state;
}

/** Header status chip for the current viewer. Spectators see the opponent-turn state. */
export function getMatchStatus(
  session: WordBattleSession,
  myUserId: string | null,
): MatchStatusState {
  switch (session.status) {
    case 'waiting':
      return 'waiting';
    case 'completed': {
      const result = session.result;
      if (!result || result.isDraw) return 'draw';
      return result.winnerId === myUserId ? 'victory' : 'defeat';
    }
    case 'abandoned':
      return 'defeat';
    default:
      return session.currentPlayerId === myUserId ? 'your_turn' : 'opponent_turn';
  }
}

/** "Round X of Y · Knockout Duel" — derived from the server's turn counter. */
export function getRoundInfo(state: WordBattleState): string {
  const totalRounds = Math.ceil(state.totalTurns / 2);
  const currentRound = Math.min(
    Math.floor(state.turnCount / 2) + 1,
    totalRounds,
  );
  return `Round ${currentRound} of ${totalRounds} · Knockout Duel`;
}

/** Milliseconds until the persisted server deadline (clamped at 0), or null without one. */
export function getRemainingMs(
  deadlineIso: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!deadlineIso) return null;
  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(deadline)) return null;
  return Math.max(0, deadline - now);
}

/** Compact countdown text: "15s" … "0s", or "1:05" once past a minute. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Center badge label combining the server turn counter with the live countdown, e.g.
 * "Turn 6 · 12s". Falls back to the turn label when no deadline is set.
 */
export function getCountdownBadgeLabel(
  state: WordBattleState,
  remainingMs: number | null,
): string {
  const turnLabel = `Turn ${Math.min(state.turnCount + 1, state.totalTurns)}`;
  if (remainingMs === null) {
    return turnLabel;
  }
  return `${turnLabel} · ${formatCountdown(remainingMs)}`;
}

/** True when the countdown is about to expire and deserves the danger treatment. */
export function isCountdownCritical(remainingMs: number | null): boolean {
  return remainingMs !== null && remainingMs <= 5_000;
}

export interface MatchupPair {
  one: MatchupPlayer;
  two: MatchupPlayer | null;
}

/**
 * PvPMatchup props from the session. Presence is deliberately omitted — there is no
 * live presence source, and the platform never fabricates online status. Scores are
 * omitted while waiting (no game state yet), which renders the "VS" placeholder.
 */
export function getMatchupPair(
  players: SessionPlayerView[],
  state: WordBattleState | null,
  result: WordBattleResult | null | undefined,
): MatchupPair {
  const toMatchup = (player: SessionPlayerView): MatchupPlayer => ({
    id: player.userId,
    username: player.username,
    avatarUrl: player.avatarUrl,
    score: state ? (state.scores[player.userId] ?? 0) : undefined,
    isCurrentTurn: state ? state.currentPlayerId === player.userId : false,
    isWinner:
      result !== null &&
      result !== undefined &&
      !result.isDraw &&
      result.winnerId === player.userId,
  });

  const [first, second] = players;
  return {
    one: first ? toMatchup(first) : { id: '', username: 'Player', score: 0 },
    two: second ? toMatchup(second) : null,
  };
}

export interface HistoryEntryView {
  key: string;
  playerUsername: string;
  word: string;
  score: number;
  penalty: WordBattlePenaltyReason | null;
  seat: number;
}

/** Newest-first turn history with usernames resolved from the session players. */
export function getHistoryEntries(
  state: WordBattleState,
  players: SessionPlayerView[],
): HistoryEntryView[] {
  const usernameBy = new Map(players.map((p) => [p.userId, p.username]));
  const seatBy = new Map(players.map((p) => [p.userId, p.seat]));
  return [...state.history]
    .map((entry, index) => ({
      key: `${state.history.length - 1 - index}:${entry.playerId}:${entry.word}:${entry.score}`,
      playerUsername: usernameBy.get(entry.playerId) ?? 'Player',
      word: entry.word,
      score: entry.score,
      penalty: entry.penalty ?? null,
      seat: seatBy.get(entry.playerId) ?? 0,
    }))
    .reverse();
}

export type FeedbackType = 'valid' | 'invalid' | 'info';

export interface MoveFeedback {
  message: string;
  type: FeedbackType;
}

const PENALTY_MESSAGES: Record<WordBattlePenaltyReason, string> = {
  TOO_SHORT: 'Too short — words need at least 3 letters. −1 life',
  DUPLICATE_WORD: 'That word was already used this match. −1 life',
  INVALID_DICTIONARY: 'Not in the dictionary. −1 life',
  ILLEGAL_PATH: 'Letters must connect on the board. −1 life',
  TIMEOUT: 'Time ran out. −1 life',
};

/**
 * Feedback for the viewer's just-submitted move, derived from the confirmed server
 * response (the newest history entry). Returns null when the response does not contain
 * a turn for the viewer.
 */
export function getMoveFeedback(
  response: WordBattleSession,
  myUserId: string | null,
): MoveFeedback | null {
  if (myUserId === null) return null;
  const state = response.state;
  const last = state.history[state.history.length - 1];
  if (!last || last.playerId !== myUserId) {
    return null;
  }
  if (last.penalty) {
    const prefix = last.word ? `"${last.word}" — ` : '';
    return {
      type: 'invalid',
      message: `${prefix}${PENALTY_MESSAGES[last.penalty]}`,
    };
  }
  return {
    type: 'valid',
    message: `"${last.word}" accepted! +${last.score} pts`,
  };
}

/** Short chip label for penalty entries in the word history. */
export function getPenaltyLabel(penalty: WordBattlePenaltyReason): string {
  switch (penalty) {
    case 'TOO_SHORT':
      return 'Too short';
    case 'DUPLICATE_WORD':
      return 'Repeat';
    case 'INVALID_DICTIONARY':
      return 'Not a word';
    case 'ILLEGAL_PATH':
      return 'No path';
    case 'TIMEOUT':
      return 'Timeout';
  }
}

/**
 * Parses a match reference for the lobby join field: a full arena URL or a bare
 * 12-character hex publicId. Returns the normalized publicId or null.
 */
export function parseMatchCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/\/games\/word-battle\/([0-9a-fA-F]{12})\/?$/);
  const candidate = fromUrl?.[1] ?? trimmed;
  return /^[0-9a-fA-F]{12}$/.test(candidate) ? candidate.toLowerCase() : null;
}
