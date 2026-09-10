# Rules (operational checklist)

Derived from [`MASTER_SYSTEM.md`](./MASTER_SYSTEM.md). Every PR MUST pass this
checklist before merge.

## Identity (§2.1)

- [ ] No phone, email, name, or device ID is collected.
- [ ] No global fixed identity is created.
- [ ] Any identifier is system-generated, minimal, unlinkable across contexts.

## Data (§2.2)

- [ ] Only the minimum data required for the feature is stored.
- [ ] Messages are ephemeral by default.
- [ ] Any new persisted field has a written justification in the PR.

## Logging & Tracking (§2.3)

- [ ] No message content is logged.
- [ ] No behavioral tracking.
- [ ] No analytics SDK, tracking script, telemetry, or crash reporter that
      sends user data.
- [ ] Any object that reaches a log sink, error message, or serialized
      response is first passed through `redactObject` from
      `@anonym-messenger/security`.
- [ ] No new field is added to a logged / returned payload without checking
      whether it should be added to `ALWAYS_REDACT_KEYS`.
      Current always-redact set includes (non-exhaustive): credentials
      (`password`, `token`, `privateKey`, `seed`, `mnemonic`, …), network /
      device metadata (`ip`, `userAgent`, `deviceId`, `fingerprint`),
      personal identifiers (`email`, `phone`), message content
      (`message`, `plaintext`), and correlation surfaces (`session`,
      `sessionId`, `conversationId`, `peerId`, `roomId`, `metadata`,
      `payload`, `headers`).

## Network (§2.4)

- [ ] No IP stored.
- [ ] No connection history log.
- [ ] No identifiable network metadata retained.

## Security (§2.5)

- [ ] No insecure shortcut.
- [ ] No temporary insecure solution.
- [ ] Encryption strength is not reduced for performance.

## Monetization (§2.6, §7)

- [ ] No payment linked to identity.
- [ ] Premium is token-based.
- [ ] No "paid user" flag exists on any account.

## External Dependencies (§2.7)

- [ ] No new tracking tool, analytics platform, or user-data crash reporter.
- [ ] Any new external service has a security review note in the PR.

## Decision Boundaries (§2.8)

STOP and escalate if the PR attempts to:

- change the identity model
- change the encryption model
- change data retention logic
- introduce a new external service
- modify monetization logic

## Forbidden Patterns (§12)

- [ ] No email login, phone login, global user search, contact discovery.
- [ ] No online status, last seen, read receipts, typing indicators.
- [ ] No persistent chat history.
- [ ] No centralized identity mapping.

## Final Rule

If the feature increases traceability, increases stored data, or reduces
anonymity — **do not implement**.

---

## Clock access (mandatory — MASTER_SYSTEM §6)

All time-dependent code MUST receive a `Clock` (from
`@anonym-messenger/utils`) or an injected time-access function. Direct reads
of the wall clock are forbidden everywhere except inside the single
sanctioned `Clock` implementation in `packages/utils/src/index.ts`.

- [ ] No `Date.now()` outside the Clock implementation.
- [ ] No unparameterized `new Date()` outside the Clock implementation.
- [ ] No `performance.now()` anywhere.
- [ ] Any new class / service / function that reads time accepts a `Clock`
      (or an equivalent injected function) as a constructor / parameter
      dependency.
- [ ] Tests use `createFrozenClock(fixed)` rather than mocking `Date`.

Enforcement:

1. ESLint `no-restricted-syntax` (`.eslintrc.cjs`).
2. `apps/api/test/clock-usage.spec.ts` scans the repository and fails CI if
   a forbidden pattern appears outside the allowlist.
3. This checklist.
