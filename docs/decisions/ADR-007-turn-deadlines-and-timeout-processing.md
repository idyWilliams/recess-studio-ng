# ADR-007: Turn deadlines and timeout processing

**Status:** Accepted — implemented and verified on 2026-10-13 against PostgreSQL. The schema
change, sweeper, and API behaviour below are live; the [implementation
notes](#implementation-notes-2026-10-13) record exactly what shipped, including one material
incompatibility that was corrected during implementation without weakening this decision.

## Context

Word Battle (see [docs/games/word-battle.md](../games/word-battle.md)) is a real-time duel:
two players alternate turns on a shared board, and each turn is expected to resolve in
seconds. Today the match only advances when a client submits a move or explicitly calls
`expire-turn`, which has three defects:

1. **The server does not own the clock.** Nothing records when a turn began, so a turn never
   expires on its own — a player who closes the app simply stalls the match.
2. **Timeouts are not restart-safe.** No deadline is persisted, so a server restart loses all
   in-flight turn timing.
3. **Timeouts are not concurrency-safe by construction.** A client-triggered expiry races
   freely with a simultaneous word submission.

The product principle "the server is authoritative for … turn" ([AGENTS.md](../AGENTS.md))
requires a deadline mechanism that is enforceable without any client cooperation.

Product tension to record honestly: the platform also documents async-friendly play
("a player can submit a move and close the app; the server persists it"). A hard deadline
means an abandoned match finishes on its own — possibly by knockout — with no one connected.
That consequence is accepted below rather than hidden.

## Decision

1. **Authoritative server-side deadline.** The API computes and owns every turn deadline. The
   client may display a countdown but never decides when a turn ends.
2. **15-second live-match rule.** Each turn gets a fixed 15-second deadline from the moment
   the turn becomes active. No per-request grace periods and no resetting of the deadline on
   reconnect or re-fetch — the deadline is set once when the turn starts.
3. **Deadline persisted outside the pure game core.** `turn_deadline_at` (timestamptz) is
   stored on `game_sessions`, alongside a partial index on `status = 'active'`. It is **not**
   added to `WordBattleState`: the game core stays pure (no wall-clock time, per ADR-006 and
   the determinism guarantee). The deadline is API/infrastructure state; the rules consume it
   only via an explicit `{ type: 'timeout' }` move, which the core already supports.
4. **Atomic timeout handling on the existing architecture.** Timeouts are applied through the
   same compare-and-swap transaction used for normal moves: `UPDATE … WHERE id = ? AND
   state_version = expected … RETURNING`, with the timeout recorded in `game_moves` in the
   same transaction. Losing racers get `409 STALE_GAME_STATE` and make no state change. The
   existing unique index on `game_moves(session_id, state_version_after)` provides a
   database-level guarantee that the same version is never applied twice.
5. **Two enforcement paths, both idempotent.** (a) A bounded in-process polling sweeper in
   the API periodically selects expired active sessions and applies their timeouts. (b)
   Lazy reconciliation: any `GET` or move touching an expired session settles that session's
   timeout first. Either path may run; whichever commits first wins, and the other no-ops via
   the CAS conflict. Correctness therefore never depends on the sweeper being alive.
6. **Restart and multi-instance behaviour.** Because the deadline is a persisted column, any
   restarted instance resumes enforcement from stored time. Because enforcement is CAS +
   unique-index idempotent, N instances sweeping concurrently produce exactly one applied
   timeout per turn; the rest no-op. No distributed locks are introduced.
7. **Graceful shutdown and test isolation.** The sweeper is owned by the API process, stops
   on shutdown, and must be disabled under test configuration so suites are deterministic.
   Tests exercise timeout logic by invoking the same service path the sweeper uses, not by
   relying on wall-clock timers.
8. **Offline abandonment is enforced, not suppressed.** If both players disconnect, turns
   still expire at 15 seconds. A match may therefore complete — including by knockout — with
   no client connected. We do not pause the clock, synthesise presence, or declare a
   "suspended" state: none of those exist or are approved, and fabricating presence would
   violate product-honesty rules.

## Consequences

- **Schema change required:** `game_sessions.turn_deadline_at` + partial index. This needs a
  Drizzle migration (`0003_*`) and must be applied before the feature works.
- **New API process responsibility:** a background loop. It must be bounded (tick interval,
  batch size) and must never block request handling.
- **Contract addition:** `GameSessionResponse` gains `turnDeadlineAt` so clients can render an
  honest countdown. `expire-turn` becomes server-verified: it rejects if 15 seconds have not
  actually elapsed, instead of trusting the client.
- **Tests:** PostgreSQL integration tests must cover persistence across simulated restart,
  move-vs-timeout races, duplicate sweeper ticks, and parallel instances; unit tests cover
  deadline computation and the fail-safe dictionary path.
- **Product risk (accepted):** strict enforcement can end a match while both players are away.
  This is documented in [docs/games/word-battle.md](../games/word-battle.md) and must not be
  "softened" later without a new decision.

## Alternatives considered

- **Client-triggered expiry only** (status quo): no persistence, no authority, no restart
  survival. Rejected.
- **Lazy-only expiry** (settle on next read, no sweeper): simpler, but an unread match never
  times out, so a turn can stall indefinitely — violates the authority requirement.
- **Pausing the deadline while players are offline**: requires presence infrastructure that
  does not exist (Socket.IO is documented but unimplemented) and risks fabricating presence.
  Rejected.
- **Deadline inside `WordBattleState` JSON**: would break the pure-core determinism guarantee
  and make sweeper queries scan JSONB. Rejected in favour of a dedicated column.

## Implementation notes (2026-10-13)

Shipped as decided above. Concrete facts (all verified against live PostgreSQL):

- **Migration:** `database/migrations/0003_good_microchip.sql` adds
  `game_sessions.turn_deadline_at` (timestamptz, nullable) and the partial index
  `game_sessions_expired_turn_idx` on `turn_deadline_at WHERE status = 'active'`. Applied to
  the development and test databases.
- **Backfill:** sessions already `active` when the migration runs receive exactly one fresh
  `now() + interval '15 seconds'` deadline; sessions in any other status keep `NULL`. A
  `NULL` deadline is never swept and `expire-turn` rejects it with `TURN_NOT_EXPIRED`, so a
  session without a stored deadline can neither gain extra time nor be penalised.
- **Single authoritative transition:** `SessionService.applyTurnTimeout` is the only code
  that applies a timeout. It is shared by (a) the `expire-turn` route — now server-verified:
  it rejects with 409 `TURN_NOT_EXPIRED` until the persisted deadline has actually passed,
  so a client can request reconciliation but cannot cause a timeout; (b) lazy reconciliation
  on `GET /game-sessions/:id` and on move submission, so a late move can never steal a turn
  the deadline has already consumed; and (c) the bounded `TurnTimeoutSweeper` (default
  1000 ms tick / 50 sessions, overridable via `TURN_SWEEP_INTERVAL_MS` and
  `TURN_SWEEP_BATCH_SIZE`; non-overlapping ticks; disabled under `NODE_ENV=test`; stopped on
  graceful shutdown via `onClose` and process signal handlers).
- **Contract additions:** `GameSessionResponse.turnDeadlineAt` (`string | null`) and the
  `TURN_NOT_EXPIRED` error code.
- **Material incompatibility found during implementation (corrected without changing the
  shared contract):** the take-turn demo game's `applyMove` throws for
  `{ type: 'timeout' }`. `GameDefinition` was deliberately NOT modified; instead the service
  probes `validateMove(state, { type: 'timeout' }, playerId)` and grants deadlines only to
  games that accept timeout moves. Demo sessions therefore persist a `NULL` deadline and no
  timeout path can touch them.
- **Determinism defect found during verification:** `PostgresSessionRepository`'s player
  query had no `ORDER BY`, allowing the row order — and with it the starting player, the
  authoritative turn owner, and the deadline — to vary with the query plan under load.
  Fixed with `ORDER BY seat, joined_at, id` (seat order is game-semantic; the extras make
  the order total).
- **Exactly-once guarantees, verified against real PostgreSQL:** deadline persistence across
  simulated restarts, concurrent `expire-turn` races (loser gets 409 `STALE_GAME_STATE`),
  move-vs-timeout races (only the timeout applies), and concurrent sweeps from two service
  instances (exactly one applied transition; the `game_moves(session_id, state_version_after)`
  unique index backs the guarantee at the database level).
- **Deployment assumption:** instances enforce one shared timeline; server clocks are
  expected to be NTP-synchronised. Cross-instance correctness does not depend on clock
  equality — races resolve through optimistic locking, not timing.
- **Legacy-deadline self-heal (audit follow-up, 2026-10-13):** the deployment backfill can
  leave an expired deadline on an active session whose game definition cannot process
  timeout moves (e.g. take-turn-demo). Lazy reconciliation and the sweeper detect such rows
  with the same capability probe and clear the deadline as infrastructure metadata through
  `SessionRepository.clearTurnDeadline` (optimistically guarded on `stateVersion`; no
  version is consumed and no move row is written): reads return 200 with a `null` deadline,
  the game continues untreated at the same version, and the sweeper stops retrying the row.
  Verified against PostgreSQL with a planted backfill deadline.
