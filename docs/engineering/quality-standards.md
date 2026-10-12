# Engineering Quality Standards

This document defines the verification and quality expectations for Recess Studio. It is the authoritative reference for what "done" means beyond compilation.

Root constitution: [AGENTS.md](../../AGENTS.md).

---

## 1. General principle

> Successful compilation, passing unit tests, HTTP 200 responses, or the existence of assets do **not** independently prove that the user experience is correct.

Quality means the behavior is correct *in the running application*, not just that the code builds. Every task must report what was verified and what was not.

---

## 2. Test layers

### Unit tests (deterministic game rules)

- All game rules in `packages/game-core` and `games/*` must have deterministic unit tests.
- Same inputs must always produce the same outputs; no I/O, randomness, or timing in rule functions.
- Cover edge cases: invalid moves, out-of-turn, game-over, boundary scores, ties.
- Run with `yarn test`.

### Integration tests

- Critical API flows (session lifecycle, moves, identity, authorization) must have integration tests where practical.
- PostgreSQL integration tests must run against a real database (see `apps/api/src/*.integration.test.ts`).
- Verify concurrency and idempotency behavior (stale state, duplicate moves).

### End-to-end tests

- E2E coverage lives under `apps/web/e2e` (Playwright).
- Use E2E for critical user journeys, not for visual regression of every pixel.
- Run with `yarn test:e2e`.

---

## 3. Static checks

| Check | Command | Purpose |
|-------|---------|---------|
| Format | `yarn format:check` | Prettier consistency |
| Lint | `yarn lint` | ESLint rules |
| Type check | `yarn typecheck` | Strict TypeScript across workspaces |
| Build | `yarn build` | Production build succeeds |

All four must pass before a change is considered complete.

---

## 4. Visual verification

For any change that affects rendering or layout:

1. Run the application locally (`yarn dev`).
2. Inspect the affected screens in an actual browser at mobile width (375px) and at least one larger breakpoint.
3. Verify:
   - Layout does not overflow or clip content.
   - Text is readable against its background (contrast).
   - Interactive targets are at least 44×44 px on touch.
   - Loading, empty, and error states render without breaking the layout.
4. Take screenshots if tooling permits and include them in the report.

If browser tooling is unavailable, state this explicitly and note the remaining risk.

---

## 5. Interaction and game feel

For interactive or game features, quality includes:

- **Responsiveness:** Taps and clicks give immediate visual feedback (press state, selection, disabled state).
- **Latency:** Perceived response should feel instant; server round-trip must not leave the UI without feedback (optimistic state or loading indicator).
- **Feedback on failure:** Invalid moves, network errors, and stale-state rejections must be surfaced to the player with a clear, recoverable message — not a silent failure or crash.
- **State transitions:** Turn changes, score updates, and game-over states must animate or update in a way that reads as intentional, not jarring.

Do not ship interactions that feel broken or unresponsive even if the underlying logic is correct.

---

## 6. Animation and motion

- Motion must reinforce meaning (turn change, valid move, game over) — not decorate arbitrarily.
- Respect `prefers-reduced-motion`: disable non-essential animations for users who request reduced motion.
- Avoid infinite loops, screen-wide parallax, or motion that could trigger vestibular discomfort.
- Animation durations should be short (typically 150–300 ms) and ease out.

---

## 7. Audio

Audio is a proposed product capability; no audio system is currently implemented. When audio is added:

- Background music and sound effects must be independently controllable (on/off and volume).
- Default to muted or require explicit opt-in on first visit (autoplay policies and accessibility).
- Provide a visual fallback for every audio cue (e.g., a flash or icon for a "ding").
- Test playback on mobile browsers where autoplay is restricted.
- Do not use audio that cannot be silenced.

---

## 8. Text messaging (WhatsApp / notifications)

WhatsApp is a distribution and notification transport (see [ADR-004](../decisions/ADR-004-whatsapp-as-distribution-layer.md)).

- Message content must be derived from authoritative server state, never from client-submitted data.
- Player-facing messages must not expose phone numbers or provider IDs.
- Message delivery is best-effort; the authoritative game state in PostgreSQL remains the source of truth.
- Rate-limit outbound messages to avoid abuse.
- Provide an in-app notification fallback when the transport is unavailable.

---

## 9. Player audio messages

Voice or audio messages between players are a proposed future social capability. If implemented:

- Recordings must be stored and served with the same privacy guarantees as chat (session-scoped, participant-only).
- Transcripts (if any) must be opt-in and not used for surveillance.
- Abuse reporting and moderation must exist before public rollout.
- Do not implement in this phase unless explicitly authorized.

---

## 10. Accessibility

- All interactive elements must have accessible names (`aria-label`, visible text, or labelled-by).
- Color is never the sole means of conveying information (icons + color for status).
- Focus states are visible and logical in tab order.
- Forms have labels, error messages, and keyboard support.
- `prefers-reduced-motion` is respected.
- Test with keyboard-only navigation on interactive flows.

---

## 11. Mobile responsiveness

- Mobile-first design. Verify at 375px width.
- No horizontal scroll on core screens.
- Touch targets ≥ 44×44 px.
- Sticky/fixed elements must not obscure primary content.
- The game surface should fill the viewport on mobile while keeping controls reachable.

---

## 12. Error, loading, and empty states

Every data-driven view must handle:

| State | Expected behavior |
|-------|-------------------|
| Loading | Skeleton or spinner; no layout shift when data arrives |
| Empty | Friendly message + primary action (e.g., "Start a game") |
| Error | Clear message + retry affordance; do not expose stack traces to users |
| Disconnected | Detect offline; queue or prompt retry; do not silently drop actions |
| Stale state | Prompt the player to refresh; never silently overwrite their input |

---

## 13. Honest test reporting

When reporting verification results:

- State exactly which commands were run and their exit status.
- Distinguish "passed" from "not run" from "could not run."
- If a check was skipped, explain why and what risk remains.
- Do not claim a feature works end-to-end unless it was exercised end-to-end.
- Do not claim browser verification unless a browser was actually used.

---

## 14. Regression prevention

- Changes to game rules must not break existing deterministic tests.
- Changes to API contracts must not break existing integration tests or clients.
- Refactors must preserve observable behavior; if behavior changes, update tests and document why.
- Run the full check suite (`yarn check`) before declaring completion where feasible.
