# Game platform

This document defines the shared game-engineering contract for Recess Studio. Individual game rules live in their own specifications (e.g., [word-battle.md](./word-battle.md)).

Root constitution: [AGENTS.md](../../AGENTS.md). Architecture: [docs/architecture/README.md](../architecture/README.md).

---

## Game definition contract

See `packages/game-core/src/types.ts`. Every game implements `GameDefinition<TState, TMove, TResult>`:

| Method | Responsibility |
|--------|----------------|
| `id`, `name` | Stable identifier and display name |
| `minPlayers`, `maxPlayers` | Seat constraints |
| `createInitialState(players)` | Produce the starting state from the player list |
| `validateMove(state, move, playerId)` | Return success or a `GameValidationFailureReason` |
| `applyMove(state, move, playerId)` | Return the next state (assumes validation passed) |
| `getNextPlayer(state)` | Current player id, or `null` when game over |
| `isGameOver(state)` | True when the match is complete |
| `getResult(state)` | Final result (winner, scores, etc.) |

Games must be:

- **Deterministic** — same state + move → same next state. No randomness, no I/O, no time in rules.
- **Server-authoritative** — only the API applies moves to persisted state.
- **Testable** — pure functions with deterministic unit tests.
- **Typed** — per-game `TState`, `TMove`, `TResult`.

---

## Session lifecycle and state ownership

```
waiting → active → completed
                └── abandoned (timeout / forfeit, future)
```

- A session is created in `waiting` status.
- When `minPlayers` join, the API calls `createInitialState` and transitions to `active`.
- Players submit moves; the API validates, applies, persists, and increments `stateVersion`.
- When `isGameOver` returns true, the API calls `getResult` and persists it, transitioning to `completed`.

State ownership:

- **State** lives in `game_sessions.state` (JSONB) with a monotonic `stateVersion`.
- **Moves** are append-only in `game_moves` with `stateVersionAfter` for audit.
- **Players** are in `game_players` with seat order.
- The API is the only writer to these tables for active game state.

---

## Authoritative move validation

The move pipeline in `apps/api` (see `session-service.ts`):

1. **Authenticate** — bearer token resolves to a user.
2. **Authorize** — user must be a session participant.
3. **Lifecycle check** — session must be `active`.
4. **Concurrency check** — `expectedStateVersion` must match stored `stateVersion`; otherwise `STALE_GAME_STATE`.
5. **Turn check** — `currentPlayerId` must equal the acting user; otherwise `NOT_YOUR_TURN`.
6. **Game-specific API pre-validation** (e.g., dictionary lookup for Word Battle) — boundary checks that require I/O stay in the API, not in game core.
7. **Domain validation** — `game.validateMove(state, move, playerId)`.
8. **Apply** — `game.applyMove(...)` computes the next state.
9. **Result** — if `isGameOver`, compute and persist `getResult`.
10. **Atomic commit** — update session state, version, current player; append move to `game_moves`.

The client never submits state, scores, winners, or completion.

---

## Handling stale state, retries, and duplicates

- Every move includes `expectedStateVersion`. Mismatch → `409 STALE_GAME_STATE`.
- The API applies moves inside a database transaction with optimistic locking.
- Duplicate move submissions are not idempotent by default — a player who retries after a successful commit gets `STALE_GAME_STATE`.
- Network failures must be handled at the client with retry + version re-check, never by resubmitting blindly.
- Game over moves transition the session to `completed` atomically; subsequent moves get `GAME_NOT_ACTIVE`.

---

## Turn progression and match completion

- `getNextPlayer(state)` determines whose turn it is. The API persists `currentPlayerId`.
- `isGameOver(state)` is the single source of truth for completion.
- `getResult(state)` must be deterministic and callable only when `isGameOver` is true.
- The winner is determined by game rules, not by client claim.

---

## Reconnection and state recovery

- A player reconnecting fetches `GET /game-sessions/:publicId` to receive the authoritative state and `stateVersion`.
- The client must reconcile its local state with the server state; the server state wins.
- If the server state is ahead of the client's last known version, the client updates its UI before accepting further input.

(Full real-time push is a future capability; currently state is fetched on demand.)

---

## Multiplayer synchronization and failure handling

- Async-friendly: a player can submit a move and close the app; the server persists it and the opponent sees it on next load.
- Real-time synchronization (Socket.IO) is planned but not implemented; poll or fetch on demand in the meantime.
- If the API process crashes mid-move, the transaction rolls back; the client retries with the current `stateVersion`.

---

## Game-specific UI vs. platform services

- Game-specific rendering lives under `apps/web/app/games/<game-slug>/` and may use game-specific assets from `apps/web/public/assets/games/<game-slug>/`.
- Shared UI primitives (buttons, avatars, turn indicators) come from `packages/ui`.
- Games may not import from other games or from `apps/api`.
- Dictionary lookups, notifications, and other I/O are provided by the API, not by game core.

---

## Testing expectations

- **Deterministic unit tests** for every game rule: initial state, valid/invalid moves, turn alternation, scoring, game-over, ties, edge cases.
- **Integration tests** for the session pipeline: create, join, move, stale-state rejection, out-of-turn rejection, game-over result.
- **E2E tests** for the critical user journey (start, play, finish) where practical.
- Rule changes must update tests; do not weaken tests to pass.

---

## Adding a new game

1. Create `games/<id>/` with a `GameDefinition` implementation.
2. Register in the API `GameRegistry`.
3. Add a game spec under `docs/games/<id>.md` documenting rules, scoring, legal actions, completion.
4. Add deterministic unit tests.
5. Wire session creation to `createInitialState`.
6. Add game-specific UI and assets.

Do not force all games into a single rendering engine or universal abstraction without demonstrated need.

---

## Existing games

| Game | Status | Spec |
|------|--------|------|
| Word Battle | Implemented (core rules + UI) | [word-battle.md](./word-battle.md) |
| Demo game | Test fixture only | — |
