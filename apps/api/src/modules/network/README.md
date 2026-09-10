# Network module

Reference: MASTER_SYSTEM section 4 (Network).

## Responsibilities

- Anonymized data transfer between peers.
- Traffic obfuscation (padding, cover traffic — Phase 4).
- Controlled outbound connection policy.

## Allowed

- Opening outbound connections via an allowlist maintained under audit.
- Dropping / replacing network metadata on outbound frames.
- Emitting count-only metrics (e.g. queue depth) that CANNOT be correlated
  to a user.

## Forbidden

- Storing IP addresses in any form, even hashed (MASTER_SYSTEM 2.4).
- Connection history logs (MASTER_SYSTEM 2.4).
- Identifiable network metadata retention (MASTER_SYSTEM 2.4).
- Accepting calls from `MessagingModule` that dictate routing — messaging
  passes opaque envelopes, it does NOT control the network (MASTER_SYSTEM 3.2).
- Using third-party CDNs, analytics endpoints, or trackers (MASTER_SYSTEM 2.7).

## Dependencies

- `@anonym-messenger/security`.
- `@anonym-messenger/utils`.
- MUST NOT import from: `identity`, `messaging`, `monetization`, `community`.

## Data Access Rules

- MUST NOT persist any frame, header, or peer descriptor beyond the scope of
  a single in-flight operation.
- MUST NOT expose client IP, geo, or ASN to any other module.
- Errors MUST be redacted via `packages/security` before reaching a log sink.

Phase 0: empty placeholder.
