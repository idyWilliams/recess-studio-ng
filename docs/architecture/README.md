# Architecture

## Modular monolith

Single deployable codebase with strict internal boundaries:

| Module     | Location                        | Role                                                   |
| ---------- | ------------------------------- | ------------------------------------------------------ |
| Web        | `apps/web`                      | UI, rendering, client state (non-authoritative)        |
| API        | `apps/api`                      | Auth, sessions, moves, validation, persistence         |
| Game rules | `packages/game-core`, `games/*` | Deterministic rules, no I/O                            |
| Shared     | `packages/shared`               | Cross-cutting types (errors, notifications interfaces) |
| UI         | `packages/ui`                   | Presentation primitives                                |
| Database   | `database`                      | Drizzle schema and migrations                          |

No microservices, Kafka, or Kubernetes in Phase 0.

## Application boundaries

- **Web** must not implement authoritative game rules.
- **API** is the application authority: authentication, authorization, session lifecycle, move pipeline, persistence.
- **Game core** has zero dependencies on React, HTTP servers, PostgreSQL, Socket.IO, or WhatsApp SDKs.

## Game architecture

Games implement `GameDefinition` (see `packages/game-core` and `docs/games/README.md`). The API loads the appropriate definition by `gameId`, validates moves server-side, applies transitions, increments `stateVersion`, and persists JSONB state.

## Server-authoritative model

```text
Client → API → AuthN/Z → Load session → Check turn & state version
  → validateMove → applyMove → persist move + state → commit → emit event (future)
```

The client never decides legality, winner, or final score.

## Database architecture

PostgreSQL + Drizzle. Core entities:

| Entity                | Responsibility                                  |
| --------------------- | ----------------------------------------------- |
| `users`               | Private platform account                        |
| `gaming_profiles`     | Public gaming persona (username, avatar)        |
| `external_identities` | Provider mapping (WhatsApp, etc.) — private     |
| `games`               | Registered game metadata                        |
| `game_sessions`       | Session lifecycle, JSONB state, version, status |
| `game_players`        | Membership and seats                            |
| `game_moves`          | Append-only move log                            |
| `game_messages`       | In-game chat (future)                           |

**JSONB for game state:** Game-specific shapes evolve per title. Normalizing every field upfront would slow iteration and couple the schema to one game. Versioned JSONB keeps the session model stable while rules live in TypeScript. Normalize selectively when query/reporting needs justify it.

See also [database.md](./database.md).

## Concurrency

Moves include an expected `stateVersion`. Accept only when it matches the stored version; otherwise return `STALE_GAME_STATE`. Increment version on each successful commit. No distributed locks in Phase 0.

## Domain modules (documented, not all implemented)

- `identity`, `players`, `games`, `game-sessions`, `matchmaking`, `chat`, `notifications`, `integrations`

Future: `game-friends`, `game-houses`, `tournaments`, `leaderboards`, `payments`, `developer-platform`.

## Realtime (planned)

Socket.IO for live updates, chat, presence, matchmaking signals. **WebSockets are not source of truth** — PostgreSQL/API state remains authoritative; async play must work offline.

## Notification abstraction

Domain calls `NotificationProvider` (`packages/shared`); WhatsApp templates and credentials live in `integrations` only.

## Security model

See [security.md](./security.md).

## REST API (intended)

```text
GET    /me
GET    /games
POST   /games
GET    /game-sessions/:id
POST   /game-sessions/:id/join
POST   /game-sessions/:id/moves
GET    /game-sessions/:id/messages
POST   /game-sessions/:id/messages
POST   /matchmaking/queues
```

Stable error codes in `@recess/shared` (`ApiErrorCode`).
