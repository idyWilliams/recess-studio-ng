# ADR-005: Separate gaming identity

## Context

Phone-linked IDs are poor public personas and raise privacy concerns.

## Decision

Split **`users` + `external_identities`** (private/linking) from **`gaming_profiles`** (public username, avatar, stats).

## Consequences

- Extra joins when resolving display in sessions.
- Clear privacy boundary for APIs and UI.
