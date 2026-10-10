# Database

## Technology

PostgreSQL 16 (local via `docker-compose.yml`), accessed through Drizzle ORM from the API layer.

## Entity responsibilities

### users

Internal account record. Not shown as public player identity. May hold private auth fields as auth is implemented.

### gaming_profiles

Public-facing persona: username, avatar, future stats surfacing. Linked 1:1 (or 1:n if alt personas are added later) to `users`.

### external_identities

Maps external provider subjects (e.g. WhatsApp) to `users`. **Never** expose `external_subject_id` or phone numbers in APIs meant for opponents or public profiles.

### games

Platform catalog entry: `id`, name, player counts, active flag. Rules implementation lives in code (`games/*`), not DB.

### game_sessions

Authoritative session row:

- `publicId` for shareable links
- `status`, `stateVersion`, `currentPlayerId`
- `state` (JSONB) — game-specific snapshot
- `result` (JSONB) when complete

### game_players

Who is in the session and seat order.

### game_moves

Immutable log of applied moves with `stateVersionAfter` for audit and replay debugging.

### game_messages

In-game chat messages tied to session and user.

## Migrations

Generated under `database/migrations/` via `yarn workspace @recess/database db:generate` once schema stabilizes.

## Seeds

Placeholder directory for local/dev seed scripts in a later phase.
