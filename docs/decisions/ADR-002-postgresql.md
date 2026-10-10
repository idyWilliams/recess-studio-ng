# ADR-002: PostgreSQL

## Context

Sessions, moves, identities, and chat need durable relational data with JSON flexibility for per-game state.

## Decision

Use **PostgreSQL** with **Drizzle ORM** and JSONB for game session state.

## Consequences

- Strong consistency for authoritative game state.
- JSONB avoids premature per-game table explosion.
- Requires migration discipline via Drizzle Kit.
