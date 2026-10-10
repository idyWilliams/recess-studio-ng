# ADR-004: WhatsApp as distribution layer

## Context

Users discover and invite via channels they already use; Recess still needs its own gaming graph and session model.

## Decision

Treat **WhatsApp as distribution and notification transport**, not as the system of record for identity, state, or rules.

## Consequences

- `NotificationProvider` and `integrations` module isolate Meta/WhatsApp APIs.
- Public player identity never exposes phone numbers or WhatsApp IDs.
