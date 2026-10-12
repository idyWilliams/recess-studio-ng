# Recess Studio — Product Vision & Feature Traceability Matrix

This document defines the complete product vision for Recess, establishes full traceability from requirements to code, and defines the phase boundaries and acceptance criteria for all platform features.

---

## 1. Feature Traceability & Coverage Matrix

| #      | Vision Feature                                            | Current Classification         | Architecture & Code State                                                                                                                                                                                                                                                                                                                                                                                                          | Target Phase                                    |
| ------ | --------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **1**  | **Player Profiles & Gaming Identity**                     | **Partially implemented**      | • DB: `users`, `gaming_profiles`, `sessions` tables migrated with unique lower username index and 1:1 user cascade constraint.<br>• Shared: `UserAccount`, `GamingProfile`, `RegisterResponse` types & Zod schemas.<br>• API: `POST /auth/register`, `GET /me`, `GET /gaming-profiles/:id` with Bearer auth.<br>• Tests: Unit & PostgreSQL integration tests passing.<br>• _Pending:_ Web UI profile management & avatar selector. | Phase 1 (UI in Phase 2)                         |
| **2**  | **Overall and Per-Game Statistics**                       | **Partially implemented**      | • Shared: `PlayerStats` (overall) and `GameStats` (per-game) models defined in `@recess/shared/stats.ts`.<br>• _Pending:_ DB schema tables (`player_stats`, `player_game_stats`), idempotent result consumer, API endpoints (`GET /gaming-profiles/:id/stats`).                                                                                                                                                                    | Phase 3                                         |
| **3**  | **Current & Best Win Streaks**                            | **Partially implemented**      | • Shared: `currentStreak` and `bestStreak` fields exist in `PlayerStats` and `GameStats`.<br>• _Pending:_ DB columns, stateful streak transition rules, idempotent game completion processing.                                                                                                                                                                                                                                     | Phase 3                                         |
| **4**  | **Wins, Losses, Draws, Games Played & Knockouts (KOs)**   | **Partially implemented**      | • Shared: `wins`, `losses`, `draws`, `gamesPlayed`, `knockouts` fields typed in `@recess/shared/stats.ts`.<br>• Game Core: `getResult` hook in `GameDefinition`.<br>• _Pending:_ DB persistence tables and game outcome evaluator.                                                                                                                                                                                                 | Phase 3                                         |
| **5**  | **Ratings, Rankings & Leaderboards**                      | **Documented only**            | • Shared: `rating: number` placeholder in stats types.<br>• Architecture: Listed in REST routes and ADRs.<br>• _Pending:_ Rating algorithm (Elo/Glicko-2), leaderboard DB views, API query routes (`GET /leaderboards/:gameId`).                                                                                                                                                                                                   | Phase 3 / Phase 4                               |
| **6**  | **Online, Offline & In-Game Presence**                    | **Partially implemented**      | • Shared: `PlayerPresenceStatus` ('online', 'in_game', 'offline') and `PlayerPresence` interface in `@recess/shared/presence.ts`.<br>• _Pending:_ Presence state store (heartbeat table/Redis), socket gateway, presence endpoints.                                                                                                                                                                                                | Phase 4                                         |
| **7**  | **Friends, Recent Opponents & Finding Players**           | **Documented only**            | • Architecture: Identified in `docs/architecture/README.md` and `docs/product/README.md`.<br>• _Pending:_ `friends` and `recent_opponents` DB tables, friend request API, public username search (`GET /gaming-profiles?search=`).                                                                                                                                                                                                 | Phase 5                                         |
| **8**  | **Live Player Counts (Real Data Only)**                   | **Missing from documentation** | • Status: Mentioned in product discussions but omitted from technical specs.<br>• Architecture: Zero vanity/fake counters permitted. Must derive from active presence heartbeats / session membership.<br>• _Pending:_ Aggregation endpoint (`GET /metrics/live-players`).                                                                                                                                                         | Phase 4                                         |
| **9**  | **Game Invites, Async Turns, Sessions & Notifications**   | **Partially implemented**      | • DB: `game_sessions`, `game_players`, `game_moves` tables and migrations in PostgreSQL.<br>• API: Session lifecycle routes implemented (`POST /game-sessions`, `POST /game-sessions/:publicId/join`, `POST /game-sessions/:publicId/moves`) with `stateVersion` optimistic locking and atomic move commit.<br>• Shared: Notification payloads and `NotificationProvider` interface in `@recess/shared/notifications.ts`.<br>• _Pending:_ Turn timeout watcher, notification sender, real-time delivery.                                                                           | Phase 2 (routes done; notifications pending)                         |
| **10** | **Matchmaking & Random Play**                             | **Documented only**            | • Architecture: Route `POST /matchmaking/queues` noted in architecture docs.<br>• _Pending:_ Queue pool, match pairing daemon, fallback to invite links.                                                                                                                                                                                                                                                                           | Phase 5                                         |
| **11** | **Game Chat & Moderation**                                | **Partially implemented**      | • DB: `game_messages` table migrated in PostgreSQL (`id`, `sessionId`, `userId`, `body`, `createdAt`).<br>• _Pending:_ Chat API endpoints (`GET/POST /game-sessions/:id/messages`), WebSocket real-time delivery, message length/rate limiting, report flags.                                                                                                                                                                      | Phase 4                                         |
| **12** | **WhatsApp Integration (Privacy-Preserved)**              | **Partially implemented**      | • Architecture: ADR-004 & ADR-005 strictly isolate WhatsApp to distribution transport.<br>• DB: `external_identities` table migrated with composite unique index on `(provider, external_subject_id)`.<br>• Security: Privacy tests verify external IDs/phone numbers are never leaked.<br>• _Pending:_ WhatsApp Cloud API webhook handler and adapter under `integrations/whatsapp`.                                              | Phase 5                                         |
| **13** | **Game Houses, Tournaments, Achievements & Sponsorships** | **Planned for a later phase**  | • Architecture: Explicitly documented as out of scope for early phases.<br>• _Pending:_ House hierarchy schema, tournament bracket engine, achievement triggers, brand placements.                                                                                                                                                                                                                                                 | Phase 6                                         |
| **14** | **Modular Pluggable Multi-Game Architecture**             | **Implemented and tested**     | • Packages: `@recess/game-core` with deterministic `GameDefinition<TState, TMove, TResult>` contract.<br>• Games: `games/word-battle` package implemented with full rules, scoring, turn engine, and game-over resolution.<br>• API: `GameRegistry` registering `demo-game` and `word-battle`; session service delegates move validation/execution to definitions.<br>• DB: `games` catalog table migrated.<br>• Tests: Deterministic unit tests passing.<br>• _Pending:_ Runtime dynamic game registry, third-party SDK.                                                                                                                                                                                 | Phase 0 (Complete) & Phase 2 (Runtime Registry) |

---

## 2. Statistics Calculation & Idempotency Specification

### 2.1 Idempotency Rules & Duplicate Protection

To guarantee that network retries, race conditions, or duplicate match-completion events never inflate statistics:

1. **Authoritative Session State Transition**:
   - A game can only be completed when `game_sessions.status` transitions from `'active'` to `'completed'`.
   - The API transition must be guarded by an atomic compare-and-swap SQL statement:
     ```sql
     UPDATE game_sessions
     SET status = 'completed', completed_at = now(), result = $1
     WHERE id = $2 AND status = 'active'
     RETURNING id;
     ```
   - If the update returns zero rows, the session was already completed; any subsequent result-processing trigger is discarded immediately as a no-op.

2. **Idempotent Match Ledger Table**:
   - When recording player results, rows are inserted into an append-only `match_results` ledger table with a unique constraint on `(session_id, user_id)`.
   - `ON CONFLICT (session_id, user_id) DO NOTHING` prevents double-counting if a worker or transaction retries.

### 2.2 Stats Update Mathematical Formulation

When an authoritative match completion event is processed for Player $p$ in game $G$:

1. **Games Played**:
   $$\text{gamesPlayed}_{new} = \text{gamesPlayed}_{old} + 1$$

2. **Outcomes (Wins, Losses, Draws)**:
   - If $p \in \text{Winners}$:
     $$\text{wins}_{new} = \text{wins}_{old} + 1$$
     $$\text{currentStreak}_{new} = \text{currentStreak}_{old} + 1$$
     $$\text{bestStreak}_{new} = \max(\text{bestStreak}_{old}, \text{currentStreak}_{new})$$
   - If $p \in \text{Losers}$:
     $$\text{losses}_{new} = \text{losses}_{old} + 1$$
     $$\text{currentStreak}_{new} = 0 \quad \text{(Streak reset on defeat)}$$
     $$\text{bestStreak}_{new} = \text{bestStreak}_{old}$$
   - If Match is a Draw / Tie:
     $$\text{draws}_{new} = \text{draws}_{old} + 1$$
     $$\text{currentStreak}_{new} = 0 \quad \text{(Draw breaks winning streak)}$$
     $$\text{bestStreak}_{new} = \text{bestStreak}_{old}$$

3. **Game-Specific Knockouts (KOs)**:
   - Where game rules report elimination or knockout points $K_p \ge 0$:
     $$\text{knockouts}_{new} = \text{knockouts}_{old} + K_p$$

4. **Scope Separation**:
   - Updates are atomically computed and stored in both:
     - `player_game_stats`: scoped to $(user\_id, game\_id)$.
     - `player_stats`: aggregated across all platform play for $user\_id$.

---

## 3. Implementation Phases & Acceptance Criteria

### Phase 0 — Foundation & Monorepo Bootstrap (Completed)

- **Scope**: Modular monorepo (`apps/*`, `packages/*`, `games/*`, `database`), strict boundary enforcement, Prettier/ESLint/TypeScript/Vitest pipeline, Next.js build verification, GitHub Actions CI.
- **Status**: Verified and fully passing locally and in CI.

### Phase 1 — Persistence, Identity & Authentication (Current Phase)

- **Scope**:
  - Drizzle PostgreSQL migrations for `users`, `gaming_profiles`, `sessions`, `games`, `game_sessions`, `game_players`, `game_moves`, `game_messages`.
  - Case-insensitive unique username index (`lower(username)`), 1:1 user-to-profile enforcement, cascade deletion.
  - Bearer session authentication with SHA-256 token hashing; zero trust for client-submitted IDs.
  - Separation of private accounts from public personas.
- **Acceptance Criteria**:
  1. Registrations persist to PostgreSQL and survive API process restarts.
  2. Protected routes (`GET /me`) reject requests without a valid Bearer token.
  3. Public endpoints (`GET /gaming-profiles/:id`) never return private emails or session tokens.
  4. Integration tests run against live PostgreSQL and confirm constraint integrity.
- **Status**: Implemented and verified in tests.

### Phase 2 — Authoritative Game Sessions & Turn Engine (In progress)

- **Scope**:
  - In-memory/database Game Registry mapping `gameId` to `GameDefinition` implementations. ✅ implemented
  - Session creation endpoint (`POST /game-sessions`). ✅ implemented
  - Session join endpoint (`POST /game-sessions/:publicId/join`). ✅ implemented
  - Authoritative move pipeline (`POST /game-sessions/:publicId/moves`) validating turns, game state transitions, and optimistic locking (`stateVersion`). ✅ implemented
  - Append-only move log in `game_moves`. ✅ implemented
  - Word Battle core game mechanics implementation. ✅ implemented
  - _Pending:_ Turn timeout watcher, notification delivery, real-time state push.
- **Acceptance Criteria**:
  1. ✅ Only server applies state transitions; client-submitted state is rejected.
  2. ✅ Duplicate or out-of-turn moves return `NOT_YOUR_TURN` or `INVALID_MOVE`.
  3. ✅ Mismatched `stateVersion` returns `STALE_GAME_STATE`.
  4. ✅ Complete moves update session JSONB state and append to `game_moves`.

### Phase 3 — Statistics, Streaks & Idempotent Result Engine

- **Scope**:
  - `player_stats` and `player_game_stats` database tables.
  - Transactional, idempotent match result handler.
  - Win/loss/draw/KO recording and streak updates per the mathematical specification.
  - Endpoint `GET /gaming-profiles/:id/stats`.
- **Acceptance Criteria**:
  1. Exactly-once stat updates: submitting completion twice produces identical stats.
  2. Defeat resets `currentStreak` to 0 while preserving `bestStreak`.
  3. KO count matches game rules output.

### Phase 4 — Realtime Play, In-Game Chat & Presence

- **Scope**:
  - WebSocket/Socket.IO connection manager.
  - Real presence heartbeats: online, offline, in-game.
  - Live player counts endpoint (`GET /metrics/live-players`) computed from genuine active presence records.
  - In-game chat endpoints (`POST /game-sessions/:id/messages`) with room broadcasting.
  - Direct invite and turn notifications using `NotificationProvider`.
- **Acceptance Criteria**:
  1. Real player counts reflect actual connections; zero fabricated or simulated numbers.
  2. Chat messages persist in `game_messages` and broadcast only to session participants.
  3. Player presence transitions to `in_game` upon session start and reverts upon completion.

### Phase 5 — Social Graph, Matchmaking & WhatsApp Distribution

- **Scope**:
  - Friends and recent opponents relationships.
  - Player search endpoint (`GET /gaming-profiles?search=`).
  - Matchmaking queue service (`POST /matchmaking/queues`).
  - WhatsApp Cloud API integration transport under `integrations/whatsapp`.
- **Acceptance Criteria**:
  1. WhatsApp phone numbers are stored strictly in `external_identities` and never surfaced in public APIs.
  2. Matchmaking successfully pairs waiting players or triggers invite links upon timeout.
  3. Players can challenge recent opponents with one tap.

### Phase 6 — Communities, Tournaments & Ecosystem

- **Scope**:
  - Game Houses: membership, house-level streaks, leaderboards.
  - Tournament brackets: single-elimination, round-robin, scheduling.
  - Achievements and badges.
  - Brand sponsorships and custom challenge themes.
- **Acceptance Criteria**:
  1. Tournament progression enforces server-authoritative match outcomes.
  2. Houses aggregate member stats without exposing private identities.
