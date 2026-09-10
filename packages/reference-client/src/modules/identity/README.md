# Identity module (Phase 1)

Reference: MASTER_SYSTEM section 4 (Identity), section 6 (anonymity),
section 12 (forbidden patterns). Cross-module matrix in
[`../../../../docs/MODULE_RULES.md`](../../../../docs/MODULE_RULES.md).

## Responsibilities

- Generate a high-entropy seed (CSPRNG) and its recovery string.
- Derive a client-only root identity from the seed.
- Derive a **new, unlinkable** identity per relationship context.
- Support deterministic re-derivation (restore from recovery string).
- Support rotation via the `epoch` field on `IdentityContext`.

## Allowed

- Producing `OpaqueId<'identity-fingerprint'>` values from HKDF-SHA512.
- Storing the seed **exclusively** via `SafeStorage` (RAM-only, TTL-enforced)
  for the lifetime of a session.
- Returning `SecureMemory` handles for key material; never raw bytes.
- Accepting an opaque relationship label provided by the caller. The label
  MUST be high-entropy and non-personal; this module does not validate
  entropy but refuses to persist the label itself anywhere.

## Forbidden

- Phone number, email, name, username, device ID, IP — anywhere
  (MASTER_SYSTEM 2.1).
- Global fixed identity across sessions or relationships (MASTER_SYSTEM 2.1, 6).
- Centralized identity mapping, contact discovery, global user search
  (MASTER_SYSTEM 12).
- Persisting plaintext key material.
- Logging identifiers, fingerprints, seeds, recovery strings, or labels —
  even redacted (MASTER_SYSTEM 2.3).
- Database / disk persistence. All storage goes through `SafeStorage`, and
  Phase 1 only wires the RAM implementation (MASTER_SYSTEM 2.2).
- HTTP surface. This module exposes NO controllers. It is consumable from
  the web client via the shared workspace.

## Dependencies

- `@anonym-messenger/security` (`SecureMemory`, `SafeStorage` RAM impl,
  `HKDF`, CSPRNG).
- `@anonym-messenger/types` (`Seed`, `RootIdentity`, `DerivedIdentity`,
  `IdentityContext`, `IdentityFingerprint`, `OpaqueId`, `Ephemeral`).
- `@anonym-messenger/utils` (`Clock` — via the composition root's
  `createSystemClock()`).
- MUST NOT import from: `messaging`, `network`, `monetization`, `community`,
  `anonymity` (rotation signal arrives as a simple `epoch` parameter; no
  cross-module wiring).

## Data Access Rules

- The ONLY persistent surface is `SafeStorage`.
- The ONLY key stored is `identity:seed:v1`, with a default 24h TTL.
- No message content, peer list, conversation, room, or metadata is stored
  by this module. Those do not exist here.
- `destroy()` is idempotent and wipes both in-memory root and the stored seed.

## Public API (`IdentityService`)

```ts
createSession(opts?: { ttlMs?: number }): Promise<RecoveryString>
restoreSession(recovery: RecoveryString, opts?: { ttlMs?: number }): Promise<void>
identityFor(context: IdentityContext): DerivedIdentity
exportRecovery(): Promise<RecoveryString>
destroy(): Promise<void>
```

`DerivedIdentity.fingerprint` is the only public identifier. Private
material is accessible only via `withBytes(fn)` on the SecureMemory handle
and is never returned as a plain string.

## Derivation scheme (v1)

```
PRK_root     = HKDF-SHA512(seed, salt="am/identity/v1/root-salt", info="am/identity/v1/root-master", 64)
PRK_derived  = HKDF-Expand(PRK_root, info = "am/identity/v1/derived|" || label || BE32(epoch), 64)
fingerprint  = base64url( HKDF-Expand(PRK_derived, info = "am/identity/v1/fingerprint", 16) )
```

Domain separation is baked into each `info` string with a version tag, so
future protocol revisions cannot collide with v1 material. Changing any of
these constants breaks determinism — they are immutable under audit.

## What is deferred to later phases

- Real asymmetric key pairs (Ed25519 signing, X25519 key-agreement) bound
  to derived identities: **Phase 2 (Messaging) under audit**.
- Encrypted-on-disk `SafeStorage`: Phase 2 / 3 under audit.
- BIP39-style human-readable mnemonic (24 words): optional upgrade; the
  base64url recovery string satisfies the Phase 1 "or equivalent" clause.
- Identity rotation scheduler: Phase 7. The `epoch` knob already exists.
- OS-level memory protection (mlock / secure enclave binding): Phase 3.
- Browser port of `node:crypto` primitives to WebCrypto: Phase 2 (required
  before `apps/web` consumes identity client-side).
