# Recess Studio (`recess-studio-ng`)

Recess is a social multiplayer gaming platform built around how people already communicate. WhatsApp is intended as a **distribution and communication layer**; the Recess platform owns gaming identity, sessions, rules, matchmaking, chat, statistics, and communities.

**Current status: Phase 0** — repository foundation only. No game mechanics, WhatsApp integration, matchmaking, or production UI yet.

## Architecture

Modular **monolith** with **pluggable games**:

- `apps/web` — Next.js client (no authoritative game rules)
- `apps/api` — authoritative application layer
- `packages/game-core` — deterministic, infrastructure-free game contracts
- `games/*` — individual game modules (Word Battle boundary only)
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

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `yarn dev`     | Web (3000) + API (4000)              |
| `yarn build`   | Build all workspaces                 |
| `yarn test`    | Unit tests (Vitest)                  |
| `yarn test:e2e`| Playwright (web shell)               |
| `yarn lint`    | ESLint                               |
| `yarn typecheck` | TypeScript project references      |
| `yarn check`   | format + lint + typecheck + test + build |

API health: `GET http://localhost:4000/health` → `{ "status": "ok" }`

## Testing

- **Unit:** game-core contract tests, shared types, API health
- **E2E:** minimal home page smoke test (`apps/web`)

## Principles

- **Quiet platform. Loud game.**
- **Server-authoritative** game state and moves
- **Strict TypeScript**, clear module boundaries
- No microservices, Kafka, or premature scale infrastructure in Phase 0

## Current scope

Foundation: workspaces, web/API shells, Drizzle schema skeleton, game definition contract, documentation, CI.

## Future scope (not in Phase 0)

WhatsApp integration, matchmaking, chat, presence, statistics, Word Battle gameplay, tournaments, Game Houses, developer SDK, payments.
