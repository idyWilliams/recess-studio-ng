import { describe, expect, it } from 'vitest';

import type { BoardTile, WordBattleState } from '@recess/game-word-battle';
import type { GameSessionPlayer } from '@recess/shared';

import type { WordBattleSession } from './api-client';
import {
  formatCountdown,
  getCountdownBadgeLabel,
  getHistoryEntries,
  getMatchStatus,
  getMatchupPair,
  getMoveFeedback,
  getOpponentLastMove,
  getOpponentMoveFeedback,
  getOpponentMoveTileIds,
  getPenaltyLabel,
  getRemainingMs,
  getRoundInfo,
  getSessionPlayers,
  getWordBattleState,
  isCountdownCritical,
  parseMatchCode,
} from './word-battle-view';

const P1 = 'user-1111';
const P2 = 'user-2222';

function makeTile(letter: string, row: number, col: number): BoardTile {
  return { id: `t_r${row}_c${col}`, letter, row, col };
}

function makeBoard(): BoardTile[][] {
  return [
    [makeTile('C', 0, 0), makeTile('A', 0, 1), makeTile('T', 0, 2), makeTile('S', 0, 3)],
    [makeTile('O', 1, 0), makeTile('D', 1, 1), makeTile('G', 1, 2), makeTile('E', 1, 3)],
    [makeTile('R', 2, 0), makeTile('S', 2, 1), makeTile('T', 2, 2), makeTile('U', 2, 3)],
    [makeTile('N', 3, 0), makeTile('I', 3, 1), makeTile('P', 3, 2), makeTile('M', 3, 3)],
  ];
}

function makeState(overrides: Partial<WordBattleState> = {}): WordBattleState {
  return {
    players: [
      { id: P1, displayName: 'Ada' },
      { id: P2, displayName: 'Grace' },
    ],
    currentPlayerId: P1,
    scores: { [P1]: 4, [P2]: 2 },
    lives: { [P1]: 3, [P2]: 3 },
    turnCount: 2,
    totalTurns: 10,
    board: makeBoard(),
    boardVersion: 2,
    usedWords: ['cat'],
    history: [],
    rngSeed: 1,
    rngStep: 3,
    ...overrides,
  };
}

function makeSessionPlayer(
  userId: string,
  username: string,
  seat: string,
  avatarUrl: string | null = null,
): GameSessionPlayer {
  return {
    id: `player-row-${seat}`,
    userId,
    username,
    avatarUrl,
    seat,
    joinedAt: '2026-10-16T10:00:00.000Z',
  };
}

function makeSession(
  overrides: Partial<WordBattleSession> & {
    state?: WordBattleState;
  } = {},
): WordBattleSession {
  return {
    id: 'session-1',
    publicId: 'aabbccddeeff',
    gameId: 'word-battle',
    status: 'active',
    state: makeState(),
    stateVersion: 5,
    currentPlayerId: P1,
    result: null,
    turnDeadlineAt: null,
    players: [
      makeSessionPlayer(P1, 'Ada', '0'),
      makeSessionPlayer(P2, 'Grace', '1'),
    ],
    startedAt: '2026-10-16T10:00:05.000Z',
    completedAt: null,
    createdAt: '2026-10-16T10:00:00.000Z',
    updatedAt: '2026-10-16T10:00:10.000Z',
    ...overrides,
  };
}

describe('getSessionPlayers', () => {  it('maps players to the view shape and sorts by seat', () => {
    const session = makeSession();
    session.players = [
      makeSessionPlayer(P2, 'Grace', '1'),
      makeSessionPlayer(P1, 'Ada', '0', '/assets/shared/avatars/avatar-chidi.svg'),
    ];

    const players = getSessionPlayers(session);
    expect(players).toEqual([
      {
        userId: P1,
        username: 'Ada',
        avatarUrl: '/assets/shared/avatars/avatar-chidi.svg',
        seat: 0,
      },
      { userId: P2, username: 'Grace', avatarUrl: null, seat: 1 },
    ]);
  });
});

describe('getWordBattleState', () => {
  it('returns null while the match is waiting (no board yet)', () => {
    const session = makeSession({
      status: 'waiting',
      state: makeSession().state,
    });
    expect(getWordBattleState(session)).toBeNull();
  });

  it('returns the server state for active and completed matches', () => {
    expect(getWordBattleState(makeSession({ status: 'active' }))).not.toBeNull();
    const completed = makeSession({ status: 'completed' });
    expect(getWordBattleState(completed)).not.toBeNull();
  });
});

describe('getMatchStatus', () => {
  it('maps waiting, your turn, and opponent turn', () => {
    expect(getMatchStatus(makeSession({ status: 'waiting' }), P1)).toBe('waiting');
    expect(getMatchStatus(makeSession(), P1)).toBe('your_turn');
    expect(
      getMatchStatus(makeSession({ currentPlayerId: P2 }), P1),
    ).toBe('opponent_turn');
  });

  it('maps completed results to victory, defeat, and draw for the viewer', () => {
    const won = makeSession({
      status: 'completed',
      result: {
        winnerId: P1,
        scores: { [P1]: 6, [P2]: 2 },
        lives: { [P1]: 3, [P2]: 0 },
        isDraw: false,
        isKnockout: true,
      },
    });
    expect(getMatchStatus(won, P1)).toBe('victory');
    expect(getMatchStatus(won, P2)).toBe('defeat');

    const draw = makeSession({
      status: 'completed',
      result: {
        winnerId: null,
        scores: { [P1]: 3, [P2]: 3 },
        lives: { [P1]: 1, [P2]: 1 },
        isDraw: true,
        isKnockout: false,
      },
    });
    expect(getMatchStatus(draw, P1)).toBe('draw');
  });
});

describe('getRoundInfo', () => {
  it('derives round labels from the server turn counter', () => {
    expect(getRoundInfo(makeState({ turnCount: 0 }))).toBe('Round 1 of 5 · Knockout Duel');
    expect(getRoundInfo(makeState({ turnCount: 1 }))).toBe('Round 1 of 5 · Knockout Duel');
    expect(getRoundInfo(makeState({ turnCount: 8 }))).toBe('Round 5 of 5 · Knockout Duel');
    expect(getRoundInfo(makeState({ turnCount: 9 }))).toBe('Round 5 of 5 · Knockout Duel');
  });
});

describe('countdown helpers', () => {
  it('getRemainingMs handles missing, invalid, future, and past deadlines', () => {
    expect(getRemainingMs(null)).toBeNull();
    expect(getRemainingMs(undefined)).toBeNull();
    expect(getRemainingMs('not-a-date')).toBeNull();
    const now = 1_000_000;
    expect(getRemainingMs(new Date(now + 5_000).toISOString(), now)).toBe(5_000);
    expect(getRemainingMs(new Date(now - 9_000).toISOString(), now)).toBe(0);
  });

  it('formatCountdown renders compact labels', () => {
    expect(formatCountdown(15_000)).toBe('15s');
    expect(formatCountdown(1_000)).toBe('1s');
    expect(formatCountdown(0)).toBe('0s');
    expect(formatCountdown(61_000)).toBe('1:01');
  });

  it('getCountdownBadgeLabel combines turn counter and countdown', () => {
    const state = makeState({ turnCount: 5 });
    expect(getCountdownBadgeLabel(state, 12_000)).toBe('Turn 6 · 12s');
    expect(getCountdownBadgeLabel(state, null)).toBe('Turn 6');
    expect(
      getCountdownBadgeLabel(makeState({ turnCount: 9, totalTurns: 10 }), 3_000),
    ).toBe('Turn 10 · 3s');
  });

  it('flags the last five seconds as critical', () => {
    expect(isCountdownCritical(null)).toBe(false);
    expect(isCountdownCritical(6_000)).toBe(false);
    expect(isCountdownCritical(5_000)).toBe(true);
    expect(isCountdownCritical(500)).toBe(true);
  });
});

describe('getMatchupPair', () => {
  it('omits scores while waiting and leaves seat two empty', () => {
    // A waiting session has exactly one player: the creator (seat 0).
    const waiting = makeSession({ status: 'waiting' });
    waiting.players = [makeSessionPlayer(P1, 'Ada', '0')];
    const pair = getMatchupPair(getSessionPlayers(waiting), null, null);
    expect(pair.two).toBeNull();
    expect(pair.one.score).toBeUndefined();
    expect(pair.one.isCurrentTurn).toBe(false);
    expect(pair.one.isWinner).toBe(false);
    // Presence is never fabricated: no live presence source exists.
    expect('presence' in pair.one).toBe(false);
  });

  it('exposes server scores, current turn, and winner flags', () => {
    const state = makeState({ currentPlayerId: P2 });
    const result = {
      winnerId: P2,
      scores: state.scores,
      lives: state.lives,
      isDraw: false,
      isKnockout: true,
    };
    const pair = getMatchupPair(getSessionPlayers(makeSession()), state, result);
    expect(pair.one.score).toBe(4);
    expect(pair.two?.score).toBe(2);
    expect(pair.one.isCurrentTurn).toBe(false);
    expect(pair.two?.isCurrentTurn).toBe(true);
    expect(pair.one.isWinner).toBe(false);
    expect(pair.two?.isWinner).toBe(true);
  });
});

describe('getHistoryEntries', () => {
  it('returns newest-first entries with resolved usernames and penalties', () => {
    const state = makeState({
      history: [
        { playerId: P1, word: 'cat', score: 3, penalty: null },
        { playerId: P2, word: 'zz', score: 0, penalty: 'TOO_SHORT' },
        { playerId: P1, word: 'dog', score: 3, penalty: null },
      ],
    });

    const entries = getHistoryEntries(state, getSessionPlayers(makeSession()));
    expect(entries.map((entry) => entry.word)).toEqual(['dog', 'zz', 'cat']);
    expect(entries[0]?.playerUsername).toBe('Ada');
    expect(entries[1]?.playerUsername).toBe('Grace');
    expect(entries[1]?.penalty).toBe('TOO_SHORT');
    expect(entries[1]?.score).toBe(0);
    expect(entries[2]?.penalty).toBeNull();
  });
});

describe('getMoveFeedback', () => {
  it('confirms an accepted word from the server response', () => {
    const response = makeSession({
      state: makeState({
        history: [{ playerId: P1, word: 'cat', score: 3, penalty: null }],
      }),
    });
    expect(getMoveFeedback(response, P1)).toEqual({
      type: 'valid',
      message: '"cat" accepted! +3 pts',
    });
  });

  it('renders each penalty reason from the server history entry', () => {
    const cases: Array<{
      penalty: NonNullable<
        WordBattleSession['state']['history'][number]['penalty']
      >;
      word: string;
      message: string;
    }> = [
      {
        penalty: 'TOO_SHORT',
        word: 'ab',
        message: '"ab" — Too short — words need at least 3 letters. −1 life',
      },
      {
        penalty: 'DUPLICATE_WORD',
        word: 'cat',
        message: '"cat" — That word was already used this match. −1 life',
      },
      {
        penalty: 'INVALID_DICTIONARY',
        word: 'xzqj',
        message: '"xzqj" — Not in the dictionary. −1 life',
      },
      {
        penalty: 'ILLEGAL_PATH',
        word: 'cay',
        message: '"cay" — Letters must connect on the board. −1 life',
      },
    ];

    for (const { penalty, word, message } of cases) {
      const response = makeSession({
        state: makeState({
          history: [{ playerId: P1, word, score: 0, penalty }],
        }),
      });
      expect(getMoveFeedback(response, P1)?.message).toBe(message);
      expect(getMoveFeedback(response, P1)?.type).toBe('invalid');
    }
  });

  it('renders the timeout penalty without an empty word prefix', () => {
    const response = makeSession({
      state: makeState({
        history: [{ playerId: P2, word: '', score: 0, penalty: 'TIMEOUT' }],
      }),
    });
    expect(getMoveFeedback(response, P2)).toEqual({
      type: 'invalid',
      message: 'Time ran out. −1 life',
    });
  });

  it('returns null for other players turns and missing viewers', () => {
    const response = makeSession({
      state: makeState({
        history: [{ playerId: P2, word: 'dog', score: 3, penalty: null }],
      }),
    });
    expect(getMoveFeedback(response, P1)).toBeNull();
    expect(getMoveFeedback(response, null)).toBeNull();
  });
});

describe('getPenaltyLabel', () => {
  it('maps penalty reasons to short chip labels', () => {
    expect(getPenaltyLabel('TOO_SHORT')).toBe('Too short');
    expect(getPenaltyLabel('DUPLICATE_WORD')).toBe('Repeat');
    expect(getPenaltyLabel('INVALID_DICTIONARY')).toBe('Not a word');
    expect(getPenaltyLabel('ILLEGAL_PATH')).toBe('No path');
    expect(getPenaltyLabel('TIMEOUT')).toBe('Timeout');
  });
});

describe('parseMatchCode', () => {
  it('accepts a bare publicId', () => {
    expect(parseMatchCode('aabbccddeeff')).toBe('aabbccddeeff');
  });

  it('accepts a full arena URL and normalizes case', () => {
    expect(
      parseMatchCode('http://localhost:3000/games/word-battle/AABBCCDDEEFF'),
    ).toBe('aabbccddeeff');
    expect(
      parseMatchCode('https://recess.example/games/word-battle/aabbccddeeff/'),
    ).toBe('aabbccddeeff');
  });

  it('rejects empty, malformed, and wrong-length inputs', () => {
    expect(parseMatchCode('')).toBeNull();
    expect(parseMatchCode('   ')).toBeNull();
    expect(parseMatchCode('hello')).toBeNull();
    expect(parseMatchCode('aabbccddeee')).toBeNull();
    expect(parseMatchCode('aabbccddeeffg')).toBeNull();
  });
});

describe('getOpponentLastMove', () => {
  it('returns null if viewer is null or history is empty', () => {
    const session = makeSession({
      state: makeState({ history: [] }),
    });
    expect(getOpponentLastMove(session, null)).toBeNull();
    expect(getOpponentLastMove(session, P1)).toBeNull();
  });

  it('returns null if the last move was played by the viewer', () => {
    const session = makeSession({
      state: makeState({
        history: [{ playerId: P1, word: 'cats', score: 4 }],
      }),
    });
    expect(getOpponentLastMove(session, P1)).toBeNull();
  });

  it('returns opponent move details if the last move was played by opponent', () => {
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const session = makeSession({
      state: makeState({
        history: [
          { playerId: P1, word: 'cats', score: 4 },
          { playerId: P2, word: 'dog', score: 3, path },
        ],
      }),
    });
    expect(getOpponentLastMove(session, P1)).toEqual({
      word: 'dog',
      score: 3,
      penalty: null,
      path,
    });
  });
});

describe('getOpponentMoveFeedback', () => {
  it('formats feedback for an accepted opponent word', () => {
    const feedback = getOpponentMoveFeedback(
      { word: 'cats', score: 4, penalty: null },
      'Grace',
    );
    expect(feedback).toEqual({
      type: 'info',
      message: 'Grace played "cats"! +4 pts',
    });
  });

  it('formats feedback for an opponent word with penalty', () => {
    const feedback = getOpponentMoveFeedback(
      { word: 'xyz', score: 0, penalty: 'INVALID_DICTIONARY' },
      'Grace',
    );
    expect(feedback).toEqual({
      type: 'info',
      message: 'Grace played "xyz" — Not in the dictionary. −1 life',
    });
  });

  it('formats feedback for an opponent timeout', () => {
    const feedback = getOpponentMoveFeedback(
      { word: '', score: 0, penalty: 'TIMEOUT' },
      'Grace',
    );
    expect(feedback).toEqual({
      type: 'info',
      message: 'Grace ran out of time! −1 life',
    });
  });
});

describe('getOpponentMoveTileIds', () => {
  it('returns spawned tiles from state.lastTransition if available', () => {
    const spawnedTiles = [makeTile('X', 0, 0), makeTile('Y', 0, 1)];
    const state = makeState({
      lastTransition: {
        consumedTileIds: ['t_r3_c0', 't_r3_c1'],
        cascadedTiles: [],
        spawnedTiles,
      },
    });
    const move = { word: 'hi', score: 2, penalty: null };
    expect(getOpponentMoveTileIds(state, move)).toEqual([spawnedTiles[0]!.id, spawnedTiles[1]!.id]);
  });

  it('falls back to path coordinates on current board if no spawnedTiles', () => {
    const board = makeBoard();
    const state = makeState({ board, lastTransition: undefined });
    const move = {
      word: 'ca',
      score: 0,
      penalty: 'TOO_SHORT' as const,
      path: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    };
    expect(getOpponentMoveTileIds(state, move)).toEqual([board[0]![0]!.id, board[0]![1]!.id]);
  });

  it('returns empty array if no spawnedTiles and no path', () => {
    const state = makeState({ lastTransition: undefined });
    const move = { word: '', score: 0, penalty: 'TIMEOUT' as const };
    expect(getOpponentMoveTileIds(state, move)).toEqual([]);
  });
});

