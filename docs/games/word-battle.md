# Word Battle

Game specification for **Word Battle** — the first implemented title on Recess Studio.

Implementation: [games/word-battle/src/word-battle.ts](../../games/word-battle/src/word-battle.ts)
Types: [games/word-battle/src/types.ts](../../games/word-battle/src/types.ts)
UI: [apps/web/app/games/word-battle/page.tsx](../../apps/web/app/games/word-battle/page.tsx)

---

## Overview

Word Battle is a two-player, turn-based, score-accumulation word game. Players take turns submitting words. Each valid word scores points. After a fixed number of rounds, the player with the higher score wins; equal scores are a draw.

---

## Players

- **Exactly 2 players.** `minPlayers = 2`, `maxPlayers = 2`.
- Seat order is determined by join order; the first joined player (creator) goes first.

---

## Game state

```typescript
interface WordBattleState {
  players: GamePlayer[];          // seat order
  currentPlayerId: string;        // whose turn
  scores: Record<string, number>; // userId → score
  turnCount: number;              // turns completed
  totalTurns: number;             // maxRounds * players.length
  history: { playerId: string; word: string; score: number }[];
}
```

- `totalTurns` defaults to `5 rounds × 2 players = 10 turns`.
- The game ends when `turnCount >= totalTurns`.

---

## Moves

```typescript
interface WordBattleMove {
  word: string;
}
```

A move is a single word string.

### Move validation (game core)

The game-core `validateMove` checks:

1. Game is not over.
2. It is the submitting player's turn.
3. The word is a non-empty string.
4. The word contains only alphabetic characters (`a-z`, case-insensitive).

The game-core does **not** check dictionary validity — that is an API-layer concern (see below).

### Dictionary validation (API layer)

Before reaching `validateMove`, the API (`session-service.ts`) calls `wordValidator.isValidWord(word)` for Word Battle. Words not recognized by the dictionary validator are rejected with `INVALID_MOVE`.

This split keeps the game core free of I/O while still enforcing real-word rules.

---

## Scoring

### Authoritative scoring (game core)

> **`score = word.length`** — one point per character.

The authoritative score is computed in `games/word-battle/src/word-battle.ts`:

```typescript
const wordScore = normalized.length; // 1 point per character
```

### Scoring discrepancy — UNRESOLVED

The web UI (`apps/web/app/games/word-battle/page.tsx`) defines a **per-letter Scrabble-style score table**:

```typescript
const LETTER_SCORES: Record<string, number> = {
  A: 1, E: 1, I: 1, N: 1, O: 1, R: 1, S: 1, T: 1, U: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
};
```

This table is **not** used by the game core. The UI currently displays per-letter scores on tiles and computes a display score from the word length, but the authoritative server-side score is always `word.length`.

**This is an unresolved decision.** The two scoring systems produce different results for many words (e.g., "GAMES" = 5 pts by length, but 1+1+3+1+1 = 7 pts by the UI table). The UI must either:

- (a) Adopt the game-core rule (1 pt per character) and remove the per-letter table, or
- (b) Have the game core adopt a per-letter scoring system and the API pass letter scores through.

**Neither option has been approved.** Do not change scoring in either layer without an explicit product decision.

---

## Turn progression

- Turns alternate strictly between the two players.
- `currentPlayerId` starts as the first player (creator).
- After each valid move, `currentPlayerId` switches to the other player.
- `turnCount` increments by 1 per move.
- When `turnCount >= totalTurns`, the game is over and `getNextPlayer` returns `null`.

---

## Completion and result

```typescript
interface WordBattleResult {
  winnerId: string | null;
  scores: Record<string, number>;
  isDraw: boolean;
}
```

- `isGameOver(state)` → `turnCount >= totalTurns`.
- `getResult(state)`:
  - Higher score wins.
  - Equal scores → `isDraw = true`, `winnerId = null`.
- The result is computed server-side and persisted to `game_sessions.result`.

---

## Legal actions per turn

1. The current player taps tiles on the board to build a word (UI).
2. The player submits the word.
3. The server validates dictionary membership and game rules.
4. On success, the score is added and the turn passes.
5. On failure, the move is rejected with `INVALID_MOVE` and the turn does not pass.

A player may not:
- Submit a word out of turn (`NOT_YOUR_TURN`).
- Submit after the game is over (`GAME_OVER` / `GAME_NOT_ACTIVE`).
- Submit an empty or non-alphabetic word (`INVALID_MOVE`).

---

## Board

The UI renders a **4×4 grid of letter tiles** (`BOARD_LETTERS` in the page component). The game core does not enforce board layout, tile adjacency, or letter distribution — it accepts any alphabetic word. Board constraints (which letters are available, adjacency rules) are currently UI-only and not validated server-side.

**Note:** This means the authoritative rules currently accept any valid dictionary word regardless of the displayed board. Whether board constraints should be enforced server-side is an **unresolved design decision**.

---

## Lives / knockout UI

The UI displays a lives/knockout HUD (3 lives per player) and a "Knockout Duel" round label. The game core has **no lives or knockout mechanic** — scoring is purely cumulative across rounds.

The lives HUD is **presentational only** and does not affect game state. Whether lives/knockout should become an authoritative mechanic is an **unresolved design decision**.

---

## Dictionary source

The API uses `dictionaryApiValidator` (`apps/api/src/games/word-validator.ts`) to check word validity. The exact dictionary source and coverage are implementation details of that validator; the game core is agnostic.

---

## Determinism

- No randomness, no time, no I/O in the game core.
- `createInitialState`, `validateMove`, `applyMove`, `isGameOver`, `getResult` are pure functions.
- Same state + move always yields the same next state.

---

## Unresolved decisions (summary)

1. **Scoring system:** word length (core) vs. per-letter Scrabble-style (UI table). Must be reconciled.
2. **Board constraints:** Are moves constrained to the displayed 4×4 board (tile availability, adjacency)? Currently not enforced server-side.
3. **Lives / knockout mechanic:** UI shows lives but core does not implement them. Is this a future mechanic or should the UI be simplified?
4. **Dictionary source and coverage:** What dictionary is authoritative? What happens for words not in the dictionary?

These decisions require product approval. Do not implement either side without explicit authorization.
