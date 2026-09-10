# Anonymity module

Reference: MASTER_SYSTEM section 4 (Anonymity), section 6.

## Responsibilities

- Prevent behavioral tracking and linkability across sessions.
- Writing-style masking (Phase 7).
- Identity rotation policy (Phase 7) — rotation is triggered here, the new
  identity is MATERIALIZED by `IdentityModule`.

## Allowed

- Emitting rotation signals (opaque) that IdentityModule subscribes to.
- Applying transformations to outbound content to reduce fingerprinting.
- Introducing jitter/cover patterns that defeat traffic analysis (coordinated
  with `NetworkModule`, but anonymity does not control the transport).

## Forbidden

- Storing any per-user behavioral model beyond a single session (MASTER_SYSTEM 6).
- Consistent identifiers across sessions (MASTER_SYSTEM 6, 12).
- Predictable rotation schedules that themselves become fingerprints.
- Calling `MonetizationModule` — premium status MUST NOT influence anonymity
  behavior (MASTER_SYSTEM 2.6, 3.2).

## Dependencies

- `@anonym-messenger/security`.
- `@anonym-messenger/types`.
- MUST NOT import from: `identity`, `messaging`, `monetization`, `community`.

## Data Access Rules

- State is session-scoped and in-memory only. No `SafeStorage` usage that
  outlives a session.
- MUST NOT read from any store owned by another module.
- Any observability surface (e.g. counters for tuning) MUST be count-only and
  NEVER per-user.

Phase 0: empty placeholder.
