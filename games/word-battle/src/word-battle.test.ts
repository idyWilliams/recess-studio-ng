import { describe, expect, it } from 'vitest';

import type { GamePlayer } from '@recess/game-core';

import { wordBattleGame } from './word-battle.js';
import type { WordBattleState } from './types.js';

describe('Word Battle — GameDefinition contract', () => {
  const players: GamePlayer[] = [
    { id: 'p1', displayName: 'Alice' },
    { id: 'p2', displayName: 'Bob' },
  ];

  it('creates initial state for two players', () => {
    const state = wordBattleGame.createInitialState(players);

    expect(state.players).toEqual(players);
    expect(state.currentPlayerId).toBe('p1');
    expect(state.scores).toEqual({ p1: 0, p2: 0 });
    expect(state.turnCount).toBe(0);
    expect(state.totalTurns).toBe(10); // 5 rounds × 2 players
    expect(state.history).toEqual([]);
  });

  it('rejects creation with wrong player count', () => {
    expect(() =>
      wordBattleGame.createInitialState([{ id: 'p1', displayName: 'Solo' }]),
    ).toThrow('Word Battle requires exactly 2 players');
  });

  it('scores a valid word by its character length', () => {
    const state = wordBattleGame.createInitialState(players);

    const next = wordBattleGame.applyMove(state, { word: 'hello' }, 'p1');

    expect(next.scores.p1).toBe(5); // 'hello' = 5 characters
    expect(next.turnCount).toBe(1);
    expect(next.currentPlayerId).toBe('p2');
    expect(next.history).toEqual([{ playerId: 'p1', word: 'hello', score: 5 }]);
  });

  it('normalizes words to lowercase', () => {
    const state = wordBattleGame.createInitialState(players);

    const next = wordBattleGame.applyMove(state, { word: 'WORLD' }, 'p1');

    expect(next.history[0]?.word).toBe('world');
    expect(next.scores.p1).toBe(5);
  });

  it('alternates turns correctly between players', () => {
    let state = wordBattleGame.createInitialState(players);

    expect(wordBattleGame.getNextPlayer(state)).toBe('p1');

    state = wordBattleGame.applyMove(state, { word: 'cat' }, 'p1');
    expect(state.currentPlayerId).toBe('p2');
    expect(wordBattleGame.getNextPlayer(state)).toBe('p2');

    state = wordBattleGame.applyMove(state, { word: 'dog' }, 'p2');
    expect(state.currentPlayerId).toBe('p1');
    expect(wordBattleGame.getNextPlayer(state)).toBe('p1');
  });

  it('rejects moves from the wrong player', () => {
    const state = wordBattleGame.createInitialState(players);

    const result = wordBattleGame.validateMove(state, { word: 'hello' }, 'p2');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('NOT_YOUR_TURN');
    }
  });

  it('rejects empty word', () => {
    const state = wordBattleGame.createInitialState(players);

    const result = wordBattleGame.validateMove(state, { word: '' }, 'p1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('INVALID_MOVE');
      expect(result.message).toContain('non-empty');
    }
  });

  it('rejects word with non-alphabetic characters', () => {
    const state = wordBattleGame.createInitialState(players);

    const r1 = wordBattleGame.validateMove(state, { word: 'hello123' }, 'p1');
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason).toBe('INVALID_MOVE');

    const r2 = wordBattleGame.validateMove(state, { word: 'hello world' }, 'p1');
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('INVALID_MOVE');
  });

  it('rejects null / missing move', () => {
    const state = wordBattleGame.createInitialState(players);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = wordBattleGame.validateMove(state, null as any, 'p1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('INVALID_MOVE');
  });

  it('accumulates scores across multiple turns', () => {
    let state = wordBattleGame.createInitialState(players);

    state = wordBattleGame.applyMove(state, { word: 'apple' }, 'p1'); // 5 pts
    state = wordBattleGame.applyMove(state, { word: 'be' }, 'p2'); // 2 pts
    state = wordBattleGame.applyMove(state, { word: 'cat' }, 'p1'); // 3 pts
    state = wordBattleGame.applyMove(state, { word: 'door' }, 'p2'); // 4 pts

    expect(state.scores.p1).toBe(8); // 5 + 3
    expect(state.scores.p2).toBe(6); // 2 + 4
    expect(state.turnCount).toBe(4);
    expect(state.history.length).toBe(4);
  });

  it('ends the game after totalTurns and determines winner', () => {
    let state = wordBattleGame.createInitialState(players);

    // Play all 10 turns (5 rounds × 2 players)
    const words = [
      'apple',
      'be', // round 1: p1=5, p2=2
      'cat',
      'door', // round 2: p1=8, p2=6
      'egg',
      'fly', // round 3: p1=11, p2=9
      'go',
      'hat', // round 4: p1=13, p2=12
      'ice',
      'jam', // round 5: p1=16, p2=15
    ];

    for (let i = 0; i < words.length; i++) {
      const playerId = i % 2 === 0 ? 'p1' : 'p2';
      state = wordBattleGame.applyMove(state, { word: words[i]! }, playerId);
    }

    expect(wordBattleGame.isGameOver(state)).toBe(true);
    expect(wordBattleGame.getNextPlayer(state)).toBeNull();

    const result = wordBattleGame.getResult(state);
    expect(result.winnerId).toBe('p1');
    expect(result.scores.p1).toBe(16);
    expect(result.scores.p2).toBe(15);
    expect(result.isDraw).toBe(false);
  });

  it('reports a draw when scores are equal', () => {
    let state = wordBattleGame.createInitialState(players);

    // Play all 10 turns with equal-length words
    for (let i = 0; i < 10; i++) {
      const playerId = i % 2 === 0 ? 'p1' : 'p2';
      state = wordBattleGame.applyMove(state, { word: 'cat' }, playerId); // 3 pts each
    }

    expect(wordBattleGame.isGameOver(state)).toBe(true);
    const result = wordBattleGame.getResult(state);
    expect(result.winnerId).toBeNull();
    expect(result.isDraw).toBe(true);
    expect(result.scores.p1).toBe(15);
    expect(result.scores.p2).toBe(15);
  });

  it('rejects moves after game is over', () => {
    let state = wordBattleGame.createInitialState(players);

    // Play all 10 turns
    for (let i = 0; i < 10; i++) {
      const playerId = i % 2 === 0 ? 'p1' : 'p2';
      state = wordBattleGame.applyMove(state, { word: 'hi' }, playerId);
    }

    expect(wordBattleGame.isGameOver(state)).toBe(true);

    const result = wordBattleGame.validateMove(state, { word: 'extra' }, 'p1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('GAME_OVER');
    }
  });

  it('game is not over before all turns are played', () => {
    let state = wordBattleGame.createInitialState(players);

    // Play 9 of 10 turns
    for (let i = 0; i < 9; i++) {
      const playerId = i % 2 === 0 ? 'p1' : 'p2';
      state = wordBattleGame.applyMove(state, { word: 'hi' }, playerId);
    }

    expect(wordBattleGame.isGameOver(state)).toBe(false);
    expect(wordBattleGame.getNextPlayer(state)).toBe('p2'); // p2's last turn
  });

  it('produces deterministic results for identical inputs', () => {
    const runGame = (): WordBattleState => {
      let state = wordBattleGame.createInitialState(players);
      const moves = [
        'alpha',
        'beta',
        'gamma',
        'delta',
        'echo',
        'fox',
        'golf',
        'hotel',
        'india',
        'juliet',
      ];
      for (let i = 0; i < moves.length; i++) {
        const playerId = i % 2 === 0 ? 'p1' : 'p2';
        state = wordBattleGame.applyMove(state, { word: moves[i]! }, playerId);
      }
      return state;
    };

    const result1 = wordBattleGame.getResult(runGame());
    const result2 = wordBattleGame.getResult(runGame());

    expect(result1).toEqual(result2);
  });
});
