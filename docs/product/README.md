# Product vision

## Positioning

Recess is a **social gaming network**, not a bag of WhatsApp mini-games. Distribution may start in channels people already use (e.g. WhatsApp links), but the platform owns play: identity, sessions, rules, matchmaking, chat, stats, and communities.

Working names: **Recess** (product), **Recess Studio** (engineering). Not legally cleared.

---

## What Recess is and is not

- **Is:** A platform for premium casual competitive games played with friends, with a distinct gaming identity separate from phone numbers.
- **Is not:** A generic SaaS dashboard, a casino, a crypto product, or a WhatsApp clone.

---

## Target users

- People who play casual competitive games with friends.
- Groups that already coordinate in chat apps.
- Players who want a distinct **gaming identity** separate from phone numbers.

---

## Core user journeys (long-term)

1. **Invite:** Friend sends a game link → tap → play.
2. **Rematch / streak:** Finish a game → challenge again → track streaks.
3. **Discover:** Find games and opponents beyond one chat thread.
4. **Identity:** Username, avatar, stats — not a phone number.

---

## Product principles

- **Quiet platform, loud game.** The platform chrome is calm; the game owns the energy.
- **Server-authoritative.** Trust comes from the server, never the client.
- **Privacy by design.** Public gaming identity is never your phone number or provider ID.
- **Product honesty.** No fabricated player counts, presence, or stats.

---

## Current implementation state

The following are established and implemented:

- Modular monorepo with web, API, game-core, shared, UI, and database packages.
- **Word Battle** game rules (core implementation) + UI arena.
- API session lifecycle: create, join, submit move — with `stateVersion` optimistic locking.
- PostgreSQL persistence for users, gaming profiles, sessions, players, moves, messages.
- Bearer-token session authentication with SHA-256 token hashing.
- Separate gaming identity from external identities.

The following are documented but **not yet implemented** (do not assume they exist):

- Real-time (Socket.IO) live updates.
- Matchmaking queue service.
- WhatsApp integration transport.
- Statistics / leaderboards persistence and endpoints.
- In-game chat real-time delivery.
- Presence / live player counts.
- Friends, recent opponents, player search.

See [roadmap.md](./roadmap.md) for the feature traceability matrix, statistics specification, and phase acceptance criteria.

---

## Scope boundaries

- First game: **Word Battle** — rules implemented; several UX mechanics (lives, board constraints, scoring model) are not finalized. See [docs/games/word-battle.md](../games/word-battle.md).
- Session-based async-friendly play.
- Server-authoritative moves.
- Separate gaming profile from external identity.

Out of scope until later phases: Game Houses, tournaments, developer marketplace, payments, full presence graph.

---

## Proposed product capabilities (not yet implemented)

The following capabilities are part of the long-term product vision but have **no current implementation**:

- **Real music playback** during gameplay (background music, per-game soundtracks, mute/volume controls).
- **Text messaging** between players via the platform (in-game chat, turn notifications, invites).
- **Player audio messages** (voice notes between opponents).

These must not be presented as existing features. If an agent implements any of these, it must be done as a separate, explicitly authorized task with its own design and verification.

---

## Long-term direction

- Multiple first- and third-party games on one session/matchmaking core.
- Game Friends, online/playing presence, in-game chat.
- Notifications abstracted from WhatsApp implementation details.
- Communities (Game Houses), tournaments, monetization.
