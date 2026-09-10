# Community module

Reference: MASTER_SYSTEM section 4 (Community).

## Responsibilities

- Spam control at message / room granularity.
- Abuse resistance: rate limits, proof-of-work challenges (Phase 6),
  ephemeral reputation scoped to a single room.

## Allowed

- In-memory, room-scoped counters with short TTLs.
- Issuing transient challenges that do not require identity.
- Room-level (not user-level) rate limiting.

## Forbidden

- Persistent reputation tracking (MASTER_SYSTEM 4, 12).
- Cross-room correlation of behavior.
- Centralized user-to-reputation mapping (MASTER_SYSTEM 12).
- Calling into `IdentityModule` to look up who sent what.

## Dependencies

- `@anonym-messenger/security`.
- `@anonym-messenger/types`.
- MUST NOT import from: `identity`, `messaging`, `monetization`.

## Data Access Rules

- All state is in-memory and scoped to a room + TTL. No persistence.
- MUST NOT publish any metric that can be used to identify a participant.

Phase 0: empty placeholder.
