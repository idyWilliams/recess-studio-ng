# ADR-001: Modular monolith

## Context

Recess needs clear boundaries for web, API, games, and integrations without operational overhead early on.

## Decision

Use a **Yarn monorepo modular monolith**: one codebase, multiple packages/apps, strict import rules. No microservices in Phase 0.

## Consequences

- Simple local dev and deployment story.
- Boundaries enforced by convention and TypeScript, not network.
- Must resist coupling (e.g. game rules in React) through review and AGENTS.md.
