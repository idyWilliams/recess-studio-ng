# Build log

Milestones and notes for build-in-public updates. Entries are added as phases ship — not pre-filled.

## Phase 0

- Repository bootstrap: monorepo, web/API shells, game-core contract, Drizzle foundation, documentation, CI.

## Word Battle — Stage 2, Phases 0–1 (2026-10-13)

- Documented ENABLE1 dictionary provenance and public-domain licensing with verifiable hashes (`apps/api/data/enable1-PROVENANCE.md`).
- Recorded proposed turn-deadline/timeout architecture as `ADR-007` (not yet implemented).
- Corrected `docs/games/word-battle.md` to match the shipped core (board, lives, penalties, transitions) and refreshed the stale `meta.ts`.
- Closed a critical board-validation bypass in the game core: words are now only accepted when formable on the actual board via legal adjacent non-repeating tiles; removed the coordinate-synthesizing fallback. Added 9 core regression tests + 2 API tests (`xylophones`/`zzzqqq` cases from the review).
- Verification: typecheck, lint, full test suite (71 tests), word-battle package build, and full repo build all pass. `format:check` fails on 18 files repo-wide — pre-existing at HEAD, intentionally not autoformatted.

## Word Battle — Stage 2, Phase 2: Authoritative turn deadlines (2026-10-13)

- Persisted server-authoritative turn deadlines: `game_sessions.turn_deadline_at` plus a partial index (migration `0003_good_microchip`). Fixed 15-second turns are established when a turn becomes active, never reset by reads, reconnects, retries, or polling, and survive API restarts. Applied to the development and test databases; sessions already active at deploy time receive exactly one fresh 15-second turn (documented backfill in the migration).
- One authoritative timeout transition (`SessionService.applyTurnTimeout`), shared by the server-verified `expire-turn` route (409 `TURN_NOT_EXPIRED` until the stored deadline has actually passed), lazy reconciliation on reads and move submissions, and a bounded sweeper (non-overlapping ticks, disabled under test, stopped on graceful shutdown). Timeouts commit through the existing optimistic-locking transaction; concurrent moves, duplicate requests, and multi-instance sweeps apply at most one timeout per turn — backed by the `game_moves(session_id, state_version_after)` unique index.
- `GameSessionResponse.turnDeadlineAt` exposes the deadline; new `TURN_NOT_EXPIRED` error code.
- Corrected a material ADR-007 incompatibility without changing the shared `GameDefinition` contract: the demo game's `applyMove` throws on timeout moves, so the service probes `validateMove` and only games that accept timeout moves receive deadlines.
- Fixed a latent determinism defect exposed by the new PostgreSQL tests: player rows were loaded without `ORDER BY`, so the starting player — and with it the turn owner and timeout target — could vary with the query plan under load.
- Verification: full test suite green (88 tests, including 9 against real PostgreSQL covering restart persistence, concurrent expire-turn, move-vs-timeout races, and multi-instance sweeps); the API suite passed on 5 consecutive runs; typecheck, lint, and full build pass. `format:check` continues to fail on pre-existing files (unchanged policy: no broad autoformatting); all lines authored in this phase are Prettier-clean.
