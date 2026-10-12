# Architecture

Recess Studio is a **modular monolith**: a single deployable codebase with strict internal boundaries. No microservices in the current phase.

Root constitution: [AGENTS.md](../../AGENTS.md). For database detail: [database.md](./database.md). For security: [security.md](./security.md).

---

## Module map

| Module | Location | Role |
|--------|----------|------|
| Web | `apps/web` | UI, rendering, client state. **Non-authoritative.** |
| API | `apps/api` | Authentication, sessions, moves, validation, persistence. **Authoritative application layer.** |
| Game rules | `packages/game-core`, `games/*` | Deterministic game rules. **Zero I/O.** |
| Shared | `packages/shared` | Cross-cutting types: errors, notifications, identity, sessions, stats. |
| UI | `packages/ui` | Presentation primitives. |
| Database | `database` | Drizzle schema and migrations. |

---

## Dependency direction

Dependencies point **inward toward game rules**:

```
apps/web  ──►  packages/ui  ──►  packages/shared
                ▲
                │
apps/api  ──►  packages/shared  ◄──  packages/game-core  ◄──  games/*
                │
                └──►  database  (Drizzle schema only)
```

Rules:

- `games/*` and `packages/game-core` depend on nothing but TypeScript. No React, no HTTP, no PostgreSQL, no WhatsApp SDK.
- `apps/api` depends on `game-core`, `games/*`, `shared`, and `database`. It orchestrates but does not embed game rules.
- `apps/web` depends on `packages/ui` and `packages/shared` types. It must never import from `apps/api` or `database`.
- `packages/shared` has no runtime dependencies on apps or database.
- `database` exports schema and client only; no business logic.

If a change requires reversing this direction, stop and record an architecture decision.

---

## Who owns what

| Concern | Owner |
|---------|-------|
| Game rules (legality, scoring, winner, completion) | `games/*` + `packages/game-core` |
| Session lifecycle, authorization, persistence | `apps/api` |
| HTTP routing, input validation (Zod) | `apps/api` routes |
| Rendering, client state, interaction feedback | `apps/web` |
| Shared types and error codes | `packages/shared` |
| Database schema and migrations | `database` |
| Provider integrations (WhatsApp) | `integrations/*` (future) — isolated |

---

## Error handling and validation boundaries

- **Input validation** happens at API boundaries with Zod schemas. Malformed payloads return `400 INVALID_INPUT` before reaching service logic.
- **Domain validation** (move legality, turn ownership) is owned by the game definition and enforced server-side.
- **Authorization** (is this user a participant?) is enforced in the API service layer before any state mutation.
- **Concurrency** is enforced via `stateVersion` optimistic locking; stale moves return `409 STALE_GAME_STATE`.
- **Error codes** are stable and defined in `@recess/shared` (`ApiErrorCode`). Clients should not parse error strings.

---

## Game architecture

Games implement `GameDefinition` (see `packages/game-core/src/types.ts` and [docs/games/README.md](../games/README.md)). The API loads the definition by `gameId`, validates moves server-side, applies transitions, increments `stateVersion`, and persists JSONB state.

```text
Client → API → AuthN/Z → Load session → Check turn & stateVersion
  → validateMove → applyMove → persist move + state → commit → emit event (future)
```

The client never decides legality, winner, or final score.

---

## Server-authoritative model

- State lives in `game_sessions.state` (JSONB) with a monotonic `stateVersion`.
- Moves include an expected `stateVersion`; the server accepts only on match.
- Each successful move appends to `game_moves` (append-only audit log).
- On game over, `getResult(state)` is called by the server and persisted to `game_sessions.result`.

No distributed locks in the current phase; PostgreSQL row-level locking and transactions protect concurrent moves.

---

## Integration isolation

- WhatsApp (and future providers) are distribution and notification transports only.
- Provider details stay in `integrations/*` and behind the `NotificationProvider` interface in `packages/shared`.
- No provider IDs or phone numbers appear in public APIs, `gaming_profiles`, or game state.

---

## Testing responsibilities by layer

| Layer | Test type | Examples |
|-------|-----------|----------|
| `packages/game-core`, `games/*` | Deterministic unit tests | Rule edge cases, scoring, game-over |
| `apps/api` | Unit + PostgreSQL integration tests | Session lifecycle, move pipeline, authz, concurrency |
| `apps/web` | Component + E2E (Playwright) | Critical journeys, rendering states |
| `packages/shared` | Unit tests | Zod schemas, error mapping |
| `database` | Migration integrity tests | Schema constraints, indexes |

See [docs/engineering/quality-standards.md](../engineering/quality-standards.md).

---

## Architecture decision records

Significant architectural decisions are recorded as ADRs in [docs/decisions/](../decisions/):

- [ADR-001](../decisions/ADR-001-modular-monolith.md) — Modular monolith
- [ADR-002](../decisions/ADR-002-postgresql.md) — PostgreSQL + JSONB
- [ADR-003](../decisions/ADR-003-server-authoritative-games.md) — Server-authoritative games
- [ADR-004](../decisions/ADR-004-whatsapp-as-distribution-layer.md) — WhatsApp as distribution layer
- [ADR-005](../decisions/ADR-005-separate-gaming-identity.md) — Separate gaming identity
- [ADR-006](../decisions/ADR-006-pluggable-game-architecture.md) — Pluggable game architecture

**Process:** When a change introduces a new architectural decision, create an ADR before implementing. ADRs are immutable once accepted; supersede with a new ADR rather than editing.

---

## Current implementation vs. target

The following are established and implemented:

- Modular monolith with workspaces (`apps/*`, `packages/*`, `games/*`, `database`).
- `GameDefinition` contract and Word Battle implementation.
- API session lifecycle (create, join, submit move) with `stateVersion` optimistic locking.
- PostgreSQL schema for users, gaming profiles, sessions, moves, messages.
- Separate gaming identity from external identities.

The following are documented but not yet implemented (do not assume they exist):

- Real-time (Socket.IO) for live updates.
- Matchmaking queue service.
- WhatsApp integration transport.
- Statistics / leaderboards persistence.
- In-game chat real-time delivery.

Where this document describes a target principle that is not yet implemented, it is labeled as future or noted explicitly. Do not treat future direction as current capability.
