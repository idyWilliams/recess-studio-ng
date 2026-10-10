# Security (Phase 0 foundation)

## Authentication & authorization

- All session and move endpoints require authenticated users (to be implemented).
- Every session operation checks membership and role (player vs spectator if added later).

## Server-side move validation

- Moves validated with the registered `GameDefinition` on the server.
- Client payloads treated as untrusted hints; state loaded from database.

## Session membership

- Join and move handlers verify `game_players` (or equivalent) before mutating state.

## Input validation

- Zod (or equivalent) at API boundaries; reject malformed payloads early.

## Rate limiting & abuse

- To be added at API edge (per-IP / per-user) before public launch.

## Secrets

- Environment variables only; never commit `.env`, tokens, or provider credentials.
- Use `.env.example` for non-secret placeholders.

## Identity separation

**Public gaming identity:** username, avatar, profile, rating, statistics.

**Never public:** WhatsApp phone numbers, WhatsApp IDs, raw external provider subject IDs.

External identifiers remain in `external_identities` and integration services only.
