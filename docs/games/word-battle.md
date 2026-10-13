# Word Battle

Game specification for **Word Battle** — the first implemented title on Recess Studio.

Implementation: [games/word-battle/src/word-battle.ts](../../games/word-battle/src/word-battle.ts)
Types: [games/word-battle/src/types.ts](../../games/word-battle/src/types.ts)
UI: [apps/web/app/games/word-battle/page.tsx](../../apps/web/app/games/word-battle/page.tsx)
Dictionary: [apps/api/data/enable1.txt](../../apps/api/data/enable1.txt) (provenance: [apps/api/data/enable1-PROVENANCE.md](../../apps/api/data/enable1-PROVENANCE.md))

---

## Implementation status

This document describes the **current** rules as implemented in the game core. Earlier
versions of this file described a simpler prototype (no board, no lives, no penalties); that
text was stale and has been removed. Status is labelled throughout:

- **[Core]** — implemented and covered by deterministic unit tests in `word-battle.test.ts`.
- **[API]** — implemented in the API layer (may still be incomplete; see *Stage 2 scope*).
- **[Proposed]** — approved direction recorded in an ADR, **not yet implemented**.
- **[Awaiting approval]** — a real divergence that needs a product decision.

---

## Overview

Word Battle is a two-player, turn-based word duel on a shared **4×4 letter board**. Players
alternate turns; each turn a player submits one word. Accepted words score points and consume
their tiles, causing the board to cascade and refill. Rule violations cost a life. The match
ends when a player is knocked out (0 lives) or the turn limit is reached.

---

## Players

- **[Core]** Exactly 2 players. `minPlayers = 2`, `maxPlayers = 2`.
- **[Core]** Seat order is join order; the creator (first join) takes the first turn.

---

## Game state

```typescript
interface WordBattleState {
  players: GamePlayer[];            // seat order (exactly 2)
  currentPlayerId: string;          // whose turn it is
  scores: Record<string, number>;   // userId → score
  lives: Record<string, number>;    // userId → remaining lives (starts at 3)
  turnCount: number;                // turns completed
  totalTurns: number;               // maxRounds * players.length = 10
  board: BoardTile[][];             // authoritative 4x4 grid [row][col]
  boardVersion: number;             // increments on every cascade/refill
  usedWords: string[];              // match-wide lowercase accepted words
  history: WordBattleTurnHistory[]; // per-turn record incl. penalty reason
  lastTransition?: BoardTransitionDelta; // last cascade delta for clients
  rngSeed: number;                  // PRNG seed
  rngStep: number;                  // PRNG step counter
}
```

- **[Core]** Each player starts with **3 lives** and **0 score**.
- **[Core]** `totalTurns` = 5 rounds × 2 players = **10 turns**.
- **[Core]** Turn state (whose turn, counts) is part of state and persists via the session's
  JSONB state column.

---

## Board and tile dynamics

- **[Core]** The board is an authoritative **4×4 grid** of letter tiles (`BoardTile`:
  `id`, `letter`, `row`, `col`). It is generated deterministically from `rngSeed`/`rngStep`
  with vowel balancing (4–7 vowels per board).
- **[Core]** When a word is accepted, its tiles are consumed; surviving tiles in each column
  fall downward (column gravity); new tiles spawn at the top. This is captured in
  `lastTransition` as a `BoardTransitionDelta` (`consumedTileIds`, `cascadedTiles`,
  `spawnedTiles`) so clients can animate and reconcile.
- **[Core]** Tile IDs are stable across cascades (`t_r{row}_c{col}_v{version}`) and
  `boardVersion` increments on every refill.

---

## Moves

```typescript
type WordBattleMove =
  | { type?: 'word'; word: string; path?: BoardCoordinate[]; isDictionaryValid?: boolean }
  | { type: 'timeout' };
```

### Word moves

- **[Core]** `word` is required. It is trimmed and lowercased before evaluation.
- **[Core]** `path` is **optional**. If provided, it must be a sequence of in-bounds,
  pairwise-adjacent (horizontal, vertical, or diagonal), non-repeating coordinates whose tile
  letters match the word exactly; otherwise the move is penalised with `ILLEGAL_PATH`.
- **[Core]** If `path` is omitted (or empty), the core resolves it with a bounded,
  deterministic depth-first search over the current board (`findPathOnBoard`). If the word
  cannot be formed from the actual board, the move is penalised with `ILLEGAL_PATH`. A word
  is never accepted unless it is demonstrably formable from the board.

### Timeout moves

- **[Core]** `{ type: 'timeout' }` represents an expired turn. It scores 0, costs 1 life,
  leaves the board unchanged, and advances the turn. See *Turn deadlines* below for when this
  move is applied.

---

## Dictionary validation

- **[API]** Dictionary membership is **not** checked by the game core (it performs no I/O).
  The API validates words against a bundled offline list — **ENABLE1**, the Enhanced North
  American Benchmark LExicon, which is public domain ([provenance](../../apps/api/data/enable1-PROVENANCE.md)).
- **[API]** If the API confirms a word is **not** in the dictionary, it flags the move with
  `isDictionaryValid: false`. The core then applies the `INVALID_DICTIONARY` penalty
  (1 life, 0 points, turn passes). This keeps dictionary I/O out of the core while still
  enforcing the real-word rule.
- **[API]** A dictionary/infrastructure failure (e.g. the word list failed to load) must
  surface as an error and **never** be treated as an invalid word — no life may be deducted
  and the turn must not advance on infrastructure failure.

---

## Scoring

- **[Core]** Authoritative scoring is **`score = word.length`** — one point per character.
- **[Awaiting approval]** The web UI currently renders a display-only Scrabble-style
  per-letter table on tiles. It is **not** used for scoring and must stay display-only unless
  a product decision changes the scoring rule. Do not introduce per-letter scoring in either
  layer without approval.

---

## Penalties

Every rule violation costs **exactly 1 life**, scores **0 points**, and **passes the turn**
(recorded in `history` with the penalty reason):

| Penalty reason | Trigger |
|---|---|
| `TOO_SHORT` | Word has fewer than 3 letters or non-alphabetic characters |
| `DUPLICATE_WORD` | Word was already accepted earlier in the match (match-wide, case-insensitive) |
| `ILLEGAL_PATH` | Path is invalid or the word cannot be formed from the current board |
| `INVALID_DICTIONARY` | API confirmed the word is not in the dictionary |
| `TIMEOUT` | The turn deadline expired |

---

## Turn progression

- **[Core]** Turns alternate strictly; `turnCount` increments once per move (accepted or
  penalised). After 10 turns the match ends.

## Completion and result

- **[Core]** A match ends immediately on **knockout** (any player reaches 0 lives) or when
  `turnCount` reaches `totalTurns`.
- **[Core]** `getResult` tie-break order on turn exhaustion: **remaining lives first**, then
  **score**, then **draw**.
- **[Core]** `WordBattleResult`: `{ winnerId, scores, lives, isDraw, isKnockout }`. Computed
  server-side and persisted to `game_sessions.result`.

---

## Turn deadlines

- **[API]** Each turn has a **15-second** deadline owned by the server, persisted as
  `game_sessions.turn_deadline_at` (outside the pure core), enforced by a bounded background
  sweeper plus lazy reconciliation on reads and move submissions, and applied atomically
  through the existing optimistic-locking transaction. Deadline expiry deducts one life,
  scores no points, leaves the board unchanged, and advances the turn. Full rationale and
  implementation notes: [ADR-007](../decisions/ADR-007-turn-deadlines-and-timeout-processing.md).
- **[API]** `expire-turn` is server-verified: it responds 409 `TURN_NOT_EXPIRED` until the
  persisted deadline has actually elapsed per server time, so a client can request
  reconciliation but cannot cause a premature timeout. The deadline is exposed via
  `GameSessionResponse.turnDeadlineAt` and is never reset by reads, reconnects, retries, or
  polling.

---

## Determinism

- **[Core]** No randomness sources, wall-clock time, or I/O in the game core. All five
  contract functions are pure; identical state + move always yields the identical next state.
- **[Core]** Randomness is confined to the deterministic Mulberry32 PRNG, parameterised by
  `rngSeed`/`rngStep` carried in state, so boards and spawns are replayable from persisted
  state. `createInitialState` accepts an optional seed (used by tests); the API uses a
  time-based seed at match start.

---

## Stage 2 scope

Planned, approved-direction work (not all implemented yet):

- Turn-deadline persistence and server-authoritative timeout processing (ADR-007) —
  **implemented 2026-10-13**, verified against PostgreSQL.
- Server-verified `expire-turn` and `turnDeadlineAt` in `GameSessionResponse` —
  **implemented 2026-10-13**.
- Bounded, deterministic dead-board recovery (reshuffle) — type field `reshuffled` exists;
  no behaviour yet.
- Dictionary load-in-`buildApp` hardening; additional PostgreSQL integration/concurrency
  coverage.
