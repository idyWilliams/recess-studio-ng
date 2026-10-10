# ADR-006: Pluggable game architecture

## Context

Multiple first-party and future third-party games must share sessions, moves, and matchmaking without rewriting the platform.

## Decision

Define **`GameDefinition`** in `@recess/game-core`; implement each game under `games/<slug>`. No public game SDK until the internal contract stabilizes.

## Consequences

- New games add a package + registry entry, not a new microservice.
- API must map `gameId` → definition safely (registry to be built in a later phase).
