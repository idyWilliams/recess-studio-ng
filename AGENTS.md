# AGENTS.md — Engineering constitution

Instructions for AI coding agents and contributors working on **Recess Studio**.

## General

- Read relevant architecture and product documentation before significant changes.
- Do not invent requirements.
- Do not implement future roadmap features unless explicitly requested.
- Keep changes focused.
- Prefer simple solutions.
- Avoid premature abstraction and infrastructure.
- Do not add dependencies without justification (needed, not duplicated, compatible).

## TypeScript

- `strict: true`; no unnecessary `any`.
- Prefer `interface` for public object contracts; use `type` for unions and utilities.
- Avoid unsafe casts; use explicit domain types at boundaries.

## Architecture

- Game rules live in `packages/game-core` and `games/*` — not in React or API route handlers.
- API controllers orchestrate; they do not embed game rules.
- Database/Drizzle code must not leak into game logic.
- Integrations (WhatsApp, etc.) stay isolated — no provider details in core domain.
- Preserve module boundaries: web, api, game-core, shared, ui, database.

## Game security

- Server is authoritative for state, score, turn, winner, move legality, completion.
- Never trust client-submitted state.
- Validate every move; authorize every session operation.
- Protect against duplicate moves, stale state (state version), and race conditions.

## Privacy

- Never expose WhatsApp phone numbers or external provider IDs as public gaming identity.
- Public identity: username, avatar, profile, rating, statistics.
- Minimize exposure of private user data.

## UI

- Mobile-first; one primary action per screen where possible.
- Avoid generic SaaS dashboard patterns and unnecessary chrome during gameplay.
- Do not redesign existing UI unless requested.
- Design direction: **quiet platform, loud game** — see `docs/design/README.md`.

## Testing

- Meaningful domain behavior should have tests over time.
- Game rules require deterministic unit tests.
- Critical flows should gain integration/E2E coverage.

## AI agent behavior

Before architectural changes:

1. Inspect the repository and relevant docs.
2. Identify affected boundaries.
3. Explain the proposed change.
4. Implement the smallest correct solution.
5. Run relevant tests and `yarn typecheck`.
6. Inspect the diff and report exactly what changed.

If a request conflicts with this architecture, **stop and explain** before weakening rules.

## Key documents

- `docs/architecture/README.md`
- `docs/games/README.md`
- `docs/product/README.md`
- `docs/decisions/` (ADRs)
