# ADR-003: Server-authoritative games

## Context

Social competitive play requires trust: clients can be tampered with or replay stale requests.

## Decision

All move validation and state transitions run on the **API** using **game-core** rules. Clients submit intent + `stateVersion`; server persists outcomes.

## Consequences

- Higher latency than pure client sim, acceptable for async/social games.
- Enables audit trail via `game_moves` and version checks (`STALE_GAME_STATE`).
