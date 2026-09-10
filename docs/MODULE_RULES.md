# Module Rules

Authoritative cross-module access matrix. Derived from MASTER_SYSTEM
sections 3.2 and 4. Every PR that changes module boundaries MUST update this
file.

## Legend

- Y  — allowed
- N  — forbidden at all times
- N* — forbidden by default; specific allowlisted items (listed per row)
- —  — not meaningful (self)

## Import matrix

Rows = importer, columns = imported module. "Import" includes TypeScript
`import`, Nest `imports: []`, provider injection, and event subscriptions.

|                | identity | messaging | network | security | anonymity | monetization | community |
| -------------- | -------- | --------- | ------- | -------- | --------- | ------------ | --------- |
| identity       | —        | N         | N       | Y        | N         | N            | N         |
| messaging      | N*       | —         | N       | Y        | N*        | N            | N         |
| network        | N        | N         | —       | Y        | N*        | N            | N         |
| security       | N        | N         | N       | —        | N         | N            | N         |
| anonymity      | N*       | N         | N*      | Y        | —         | N            | N         |
| monetization   | N        | N         | N       | Y        | N         | —            | N         |
| community      | N        | N         | N       | Y        | N         | N            | —         |

Notes on `N*` exceptions (only activated under audit in later phases):

- `messaging -> identity`: only opaque `OpaqueId<'peer'>` values may be
  passed in by callers. Messaging does NOT import the Identity module; it
  accepts IDs as parameters.
- `messaging -> anonymity`: signal-only; messaging subscribes to rotation
  signals but does not read anonymity state.
- `network -> anonymity`: coordination of padding / cover traffic patterns;
  no user-correlatable data crosses the boundary.
- `anonymity -> identity`: rotation SIGNAL only. The new identity is
  materialized inside IdentityModule; AnonymityModule never holds keys.
- `anonymity -> network`: advisory hints only.

## Data-access rules per module

### identity

- CAN access: `SafeStorage` (with TTL), `SecureMemory`, `Redaction`.
- MUST NEVER access: any store owned by another module, any logging sink,
  any network surface.
- Emits: `OpaqueId<Kind>` values only.

### messaging

- CAN access: `SafeStorage` with TTL ≤ message lifecycle, `SecureMemory`,
  `Redaction`.
- MUST NEVER access: IdentityModule's internal state, IP addresses, network
  transport details.
- Emits: envelope-shaped opaque payloads + `Ephemeral<T>` results.

### network

- CAN access: outbound connections via an audit-maintained allowlist.
- MUST NEVER access: any persistent store, message content, identity state,
  monetization state.
- Emits: count-only metrics.

### security

- CAN access: the security primitives it owns.
- MUST NEVER access: any feature module.
- Emits: global providers (guards, interceptors, filters).

### anonymity

- CAN access: in-memory session state, `Redaction`.
- MUST NEVER access: persistent stores, per-user histories, monetization
  state.
- Emits: rotation signals, advisory hints.

### monetization

- CAN access: its own token records keyed by `(tokenHash, feature, ttl)`.
- MUST NEVER access: IdentityModule, MessagingModule, network transport
  details, or any per-identity record anywhere.
- Emits: pure boolean feature checks keyed by token.

### community

- CAN access: in-memory room-scoped counters with TTL.
- MUST NEVER access: persistent reputation, per-user histories, identity
  records.
- Emits: room-level rate-limit decisions.

## Enforcement

1. ESLint `no-restricted-imports` + `no-restricted-syntax` (root `.eslintrc.cjs`).
2. PR checklist in `docs/RULES.md`.
3. Placeholder tests in `apps/api/test/` that fail if a forbidden import
   appears in the module source (Phase 1 will flesh these out).
4. Audit review before any `N*` exception is activated.

## Time access (cross-module rule)

In addition to the per-module data-access rules above, every module MUST
obey the following repo-wide rule:

- **No module reads the wall clock directly.** All time values enter a
  module via a `Clock` (from `@anonym-messenger/utils`) or an injected
  time-access function. This applies equally to feature modules, tests
  (which should use `createFrozenClock`), and shared packages.
- The only sanctioned raw-clock reference lives in
  `packages/utils/src/index.ts`. Everywhere else, `Date.now`, unparameterized
  `new Date()`, and `performance.now()` are denied by ESLint and by the
  `clock-usage.spec.ts` guardrail.

Rationale: uncontrolled wall-clock reads are a behavioural fingerprint
source (MASTER_SYSTEM §6) and a timing side-channel (§5). Centralising time
behind `Clock` keeps these concerns in one audited place.
