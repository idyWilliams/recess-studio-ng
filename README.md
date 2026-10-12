# Recess Studio (`recess-studio-ng`)

Recess is a social multiplayer gaming platform built around how people already communicate. WhatsApp is intended as a **distribution and communication layer**; the Recess platform owns gaming identity, sessions, rules, matchmaking, chat, statistics, and communities.

**Current status:** Foundation + Word Battle core mechanics + authoritative session pipeline. Real-time, matchmaking, WhatsApp transport, and statistics persistence are not yet implemented.

## Architecture

Modular **monolith** with **pluggable games**:

- `apps/web` — Next.js client (no authoritative game rules)
- `apps/api` — authoritative application layer
- `packages/game-core` — deterministic, infrastructure-free game contracts
- `games/*` — individual game modules (Word Battle implemented)
- `database` — PostgreSQL schema via Drizzle

See [docs/architecture/README.md](./docs/architecture/README.md) and [AGENTS.md](./AGENTS.md).

## Repository structure

```text
apps/web, apps/api
packages/game-core, shared, ui, config
games/word-battle
database/migrations, database/seeds
docs/
```

## Prerequisites

- Node.js 20+
- Yarn 1.x
- Docker (for local PostgreSQL)

## Setup

```bash
cp .env.example .env
docker compose up -d
yarn install
```

## Development

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `yarn dev`       | Web (3000) + API (4000)                  |
| `yarn build`     | Build all workspaces                     |
| `yarn test`      | Unit tests (Vitest)                      |
| `yarn test:e2e`  | Playwright (web shell)                   |
| `yarn lint`      | ESLint                                   |
| `yarn typecheck` | TypeScript project references            |
| `yarn check`     | format + lint + typecheck + test + build |

API health: `GET http://localhost:4000/health` → `{ "status": "ok" }`

## Testing

- **Unit:** game-core contract tests, shared types, API health, Word Battle rules
- **Integration:** PostgreSQL-backed identity and session tests
- **E2E:** minimal home page smoke test (`apps/web`)

## Principles

- **Quiet platform. Loud game.**
- **Server-authoritative** game state and moves
- **Strict TypeScript**, clear module boundaries
- No microservices, Kafka, or premature scale infrastructure

## Current scope

Foundation (workspaces, CI), gaming identity & auth, authoritative session pipeline (create, join, submit move with `stateVersion` optimistic locking), Word Battle core rules + UI arena, asset library.

## Future scope (not yet implemented)

WhatsApp integration, matchmaking, chat real-time delivery, presence, statistics persistence, Word Battle UX mechanics (lives, board constraints, scoring model), tournaments, Game Houses, developer SDK, payments.
