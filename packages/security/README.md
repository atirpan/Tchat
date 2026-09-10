# @anonym-messenger/security

Security primitives package. Phase 1 ships real implementations of the
core in-process primitives needed by the Identity module. Device-level
protections (screenshot blocking, OS-mlock equivalents, fake UI mode)
remain Phase 3.

## Surface (Phase 1)

| Export                     | Kind                 | Status in Phase 1 |
| -------------------------- | -------------------- | ----------------- |
| `SecureMemory`             | interface            | contract frozen   |
| `createSecureMemory`       | factory              | real impl         |
| `SafeStorage`              | interface            | contract frozen   |
| `createRamSafeStorage`     | factory              | real impl (RAM)   |
| `createEncryptedSafeStorage` | factory            | throws (deferred) |
| `redactValue`              | function             | usable            |
| `redactObject`             | function             | usable            |
| `ALWAYS_REDACT_KEYS`       | `Set<string>`        | usable            |
| `REDACTED`                 | const token          | `'[REDACTED]'`    |
| `randomBytes`              | CSPRNG               | real impl         |
| `sha256` / `sha512`        | hash                 | real impl         |
| `hmacSha512`               | MAC                  | real impl         |
| `hkdfExtract` / `hkdfExpand` / `hkdf` | KDF (RFC 5869) | real impl         |
| `constantTimeEqual`        | timing-safe compare  | real impl         |
| `zeroize`                  | RAM hygiene          | real impl         |

## What is still deferred (audit-gated)

- Encrypted-on-disk SafeStorage (Phase 2 / 3).
- Asymmetric key protocols (Ed25519 signing, X25519 ECDH) — Phase 2.
- AEAD + envelope encryption — Phase 2.
- Double Ratchet / PFS — Phase 2.
- WebCrypto backend for browser builds — Phase 2 before `apps/web` consumes
  the crypto primitives.
- OS-level memory protection (mlock / VirtualLock / enclave binding) —
  Phase 3.

## Redaction rules

Before any object reaches a log sink, an error message, or a serialized
response, pass it through `redactObject`. The `ALWAYS_REDACT_KEYS` set is
the single source of truth for which keys must be erased, and it is walked
recursively.

Always-redact categories:
- credentials (`password`, `token`, `privateKey`, `seed`, `mnemonic`, …)
- network / device metadata (`ip`, `userAgent`, `deviceId`, `fingerprint`)
- personal identifiers (`email`, `phone`)
- message content (`message`, `plaintext`)
- correlation surfaces (`session`, `sessionId`, `conversationId`, `peerId`,
  `roomId`, `metadata`, `payload`, `headers`)

## No plaintext

- Crypto functions accept `Uint8Array`, not strings.
- `SecureMemory` refuses to serialize: `toJSON`/`toString` return `[SecureMemory]`.
- Nothing in this package logs.

MASTER_SYSTEM references: 2.2, 2.3, 2.5, 5, 6, 11.
