ALTER TABLE "game_sessions" ADD COLUMN "turn_deadline_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "game_sessions_expired_turn_idx" ON "game_sessions" USING btree ("turn_deadline_at") WHERE "game_sessions"."status" = 'active';--> statement-breakpoint
-- Backfill (Stage 2, ADR-007 — see docs/decisions/ADR-007-turn-deadlines-and-timeout-processing.md):
-- Turn deadlines were not recorded before this migration, so no historical deadline can be
-- reconstructed for sessions that were already active. Two extreme options are rejected:
-- leaving them NULL forever (indefinite immunity from timeouts) and expiring them immediately
-- (penalizing matches that were played under the old rules). Instead, each active session
-- receives exactly one fresh 15-second turn at deploy time (matching TURN_DURATION_MS = 15000),
-- after which the normal server-authoritative rules apply. Sessions in any other status keep a
-- NULL deadline; the sweeper never considers NULL deadlines and the service rejects timeout
-- requests for them.
UPDATE "game_sessions" SET "turn_deadline_at" = now() + interval '15 seconds' WHERE "status" = 'active';