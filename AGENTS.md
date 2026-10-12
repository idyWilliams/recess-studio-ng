# AGENTS.md — Engineering & Product Constitution

Mandatory entry point for all AI coding agents and contributors working on **Recess Studio**.

Recess Studio is a **game-first social gaming platform** — not a generic SaaS application with games embedded. The product must combine robust software architecture, distinctive visual design, satisfying gameplay, privacy-conscious social features, reliable multiplayer behavior, and disciplined development practices.

This document is authoritative. Detailed implementation guidance lives in the specialist documents it links to.

---

## 1. Product identity and governing principles

- **What it is:** A social gaming network where friends play premium casual games together. WhatsApp (and future channels) are distribution and notification layers — Recess owns identity, sessions, rules, matchmaking, chat, stats, and communities.
- **What it is not:** A bag of WhatsApp mini-games. A generic SaaS dashboard. A casino or crypto product. A clone of Discord or WhatsApp.
- **Governing principles:**
  - **Quiet platform, loud game.** Platform chrome stays minimal and calm; the game surface owns visual energy.
  - **Server-authoritative.** The API decides state, score, turn, winner, move legality, and match completion. Clients submit intent only.
  - **Privacy by design.** Public gaming identity (username, avatar, profile, rating, stats) is never the same as private account or provider identity.
  - **Product honesty.** Never fabricate player counts, presence, ratings, statistics, match states, or competitive results. Never show an animation that falsely implies an authoritative game event occurred.

See [docs/product/README.md](./docs/product/README.md) for product scope and journeys.

---

## 2. Required documentation to consult

Before significant work, read the relevant documents:

| Task type | Required reading |
|-----------|-----------------|
| Any significant change | [docs/architecture/README.md](./docs/architecture/README.md), this file |
| Product or UX changes | [docs/product/README.md](./docs/product/README.md), [docs/design/README.md](./docs/design/README.md) |
| Game rules or new game | [docs/games/README.md](./docs/games/README.md), the relevant game spec, [packages/game-core](./packages/game-core) |
| Visual or UI work | [docs/design/README.md](./docs/design/README.md), [docs/design/assets.md](./docs/design/assets.md) |
| Asset creation or integration | [docs/design/assets.md](./docs/design/assets.md) |
| Testing or verification | [docs/engineering/quality-standards.md](./docs/engineering/quality-standards.md) |
| Architecture changes | [docs/architecture/README.md](./docs/architecture/README.md), [docs/decisions/](./docs/decisions) |
| AI agent workflow | [docs/engineering/ai-agent-workflow.md](./docs/engineering/ai-agent-workflow.md) |

---

## 3. Engineering standards

### TypeScript and maintainability

- `strict: true` is the baseline. No unnecessary `any`, no unsafe casts, no hidden type assumptions.
- Prefer `interface` for public object contracts; use `type` for unions and utilities.
- Prefer clear, maintainable code over unnecessary abstraction.
- Add dependencies only when justified (needed, not duplicated, compatible). Preserve existing package-manager and repository conventions (Yarn 1.x workspaces).

### Architecture

- Game rules live in `packages/game-core` and `games/*` — **not** in React components, API route handlers, or database code.
- API controllers orchestrate; they do not embed game rules.
- Database/Drizzle code must not leak into game logic.
- Integrations (WhatsApp, etc.) stay isolated — no provider details in core domain.
- Preserve module boundaries: `apps/web`, `apps/api`, `packages/game-core`, `packages/shared`, `packages/ui`, `database`.
- Dependency direction is one-way inward toward game rules; see [docs/architecture/README.md](./docs/architecture/README.md).

### Security and authoritative state

- The server is authoritative for state, score, turn, winner, move legality, and match completion.
- Never trust client-submitted state, scores, winners, or complete game state.
- Authorize every session operation. Validate every move.
- Protect against duplicate moves, stale state (`stateVersion`), and race conditions (optimistic locking, transactions).
- Treat retries and network failures explicitly.

### Privacy

- Never expose WhatsApp phone numbers or external provider IDs as public player identity.
- Public identity: username, avatar, profile, rating, statistics.
- Minimize exposure of private user data. Do not log sensitive information.
- Do not mistake authentication identity for public gaming identity.

### Product honesty

- Never fabricate player counts, online presence, ratings, statistics, match states, or competitive results.
- Clearly distinguish fixture data from live data.
- Never show an animation that falsely implies an authoritative game event occurred.
- Do not replace real integration with mock behavior without explicitly identifying the result as a prototype.

---

## 4. Design and interaction quality

- **Quiet platform, loud game.** Avoid generic SaaS dashboard patterns during gameplay.
- Mobile-first. One primary action per screen where possible.
- Accessible interaction targets and readable type are mandatory, not polish.
- Treat accessibility, responsiveness, interaction feedback, and loading performance as part of quality.
- Require reference-aware design and actual rendered verification for substantial visual work.
- Do not redesign existing UI unless requested.

See [docs/design/README.md](./docs/design/README.md) for the visual system, motion, anti-patterns, and measurable quality criteria.

---

## 5. Assets and media

- Assets must actually exist and load correctly. Creating a folder or writing an SVG without using it is not completion.
- Use approved formats and naming conventions. Optimize for mobile performance.
- Distinguish production assets from placeholders explicitly.
- Generated concept art must be translated into usable individual assets before it counts as done.
- Never claim generated reference images are available in the repository unless their existence has been verified.

See [docs/design/assets.md](./docs/design/assets.md) for directory ownership, formats, optimization, and replacement procedures.

---

## 6. Testing and verification

- Meaningful domain behavior should have tests over time.
- Game rules require deterministic unit tests.
- Critical flows should gain integration/E2E coverage.

**Important:** Successful compilation, passing unit tests, HTTP 200 responses, or the existence of assets do not independently prove that the user experience is correct.

- For visual work, inspect the rendered application in an actual browser where tooling permits.
- For interactive work, exercise the interaction.
- For audio, test playback and fallback behavior.
- Consider error, loading, empty, disconnected, and retry states.

If a required verification cannot be completed, report the limitation and remaining risk. Do not mark the requirement as passed.

See [docs/engineering/quality-standards.md](./docs/engineering/quality-standards.md).

---

## 7. AI-agent workflow

Agents operate in four modes. The distinction between approval to plan and approval to implement is unambiguous.

- **Review mode:** Inspect and report. Do not edit files.
- **Planning mode:** Inspect and propose a solution. Identify affected files, boundaries, risks, and tests. Do not implement. Stop and wait for approval.
- **Implementation mode:** Begin changes only when explicitly authorized. Stay within scope. Preserve unrelated work. Stop and explain if a material discovery requires a different approach.
- **Verification mode:** Inspect the diff, run checks, verify actual behavior, report results and limitations accurately.

See [docs/engineering/ai-agent-workflow.md](./docs/engineering/ai-agent-workflow.md) for the full workflow and escalation rules.

---

## 8. Definition of done

An implementation is complete only when all applicable criteria are satisfied:

1. Meets the explicitly authorized requirements.
2. Respects existing architectural boundaries.
3. Has meaningful tests for changed behavior.
4. Relevant type checks, linting, tests, and builds have run.
5. Critical interactions have been exercised where applicable.
6. Visual work has been inspected in the rendered application where tooling permits.
7. Assets actually exist and load correctly.
8. Accessibility, responsiveness, and error handling have been considered.
9. The diff contains no unrelated changes.
10. The final report distinguishes verified facts from assumptions and unverified behavior.

If a required verification cannot be completed, report the limitation and remaining risk. Do not mark the requirement as passed.

---

## 9. Scope discipline

- Do not implement roadmap features without authorization.
- Do not alter established game mechanics to improve the appearance of a demo.
- Do not broaden a focused task into a platform-wide refactor.
- Do not claim success without evidence.

If a request conflicts with this constitution, **stop and explain** before weakening rules.

---

## 10. Key documents

- [docs/architecture/README.md](./docs/architecture/README.md)
- [docs/product/README.md](./docs/product/README.md)
- [docs/design/README.md](./docs/design/README.md)
- [docs/games/README.md](./docs/games/README.md)
- [docs/engineering/quality-standards.md](./docs/engineering/quality-standards.md)
- [docs/engineering/ai-agent-workflow.md](./docs/engineering/ai-agent-workflow.md)
- [docs/decisions/](./docs/decisions) (ADRs)
