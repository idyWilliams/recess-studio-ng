# Game platform

## Architecture

Each game is a module under `games/<slug>` that depends on `@recess/game-core`. The API registers games by `id` and delegates `validateMove` / `applyMove` to the matching definition.

## Game definition contract

See `packages/game-core/src/types.ts`. Games must be:

- **Deterministic** — same state + move → same next state
- **Server authoritative** — only API applies moves to persisted state
- **Testable** — pure functions, no DB/network in rules
- **Typed** — per-game `TState`, `TMove`, `TResult`

## State, moves, results

- **State:** stored in `game_sessions.state` (JSONB) with monotonic `stateVersion`
- **Moves:** client submits move payload + expected version; server validates and appends `game_moves`
- **Results:** from `getResult(state)` when `isGameOver(state)`; persisted on session

## Adding a future game

1. Create `games/<id>/` with a `GameDefinition` implementation.
2. Register metadata in `games` table and API game registry (future).
3. Add deterministic unit tests for rules and edge cases.
4. Wire session creation to `createInitialState(players)`.

## Word Battle

First planned title: `games/word-battle`. **Game mechanics are not finalized and are not implemented in Phase 0.** Only module metadata and package boundary exist.
