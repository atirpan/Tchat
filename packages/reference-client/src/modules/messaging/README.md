# Messaging module (Phase 2)

Reference: MASTER_SYSTEM section 4 (Messaging), section 2.2 (ephemeral),
section 6 (unlinkability), section 12 (forbidden patterns). Cross-module
matrix in [`../../../../docs/MODULE_RULES.md`](../../../../docs/MODULE_RULES.md).

## Responsibilities

- Establish a **relation-bound** message session from an externally-supplied
  `sharedSecret` (ECDH handshake lives in Phase 3 / network layer — out of
  scope here).
- Seal plaintext into a minimal outer envelope.
- Open and authenticate an incoming outer envelope.
- Ratchet per-direction chain keys forward on every message (symmetric
  forward secrecy).
- Enforce per-session replay guard + sentAt sanity bounds.
- Keep all session state in RAM; no persistence.

## Allowed

- `DerivedIdentity` as an input type (no calls into IdentityModule; just
  the type shape from `@anonym-messenger/types`).
- Messaging-specific HKDF labels versioned `am/messaging/v1/...`.
- Consuming `SecureMemory` handles supplied by the caller.
- Emitting a session descriptor containing only the opaque `sessionId`,
  `role`, and local-only `expiresAtMs`.
- Using the RAM-only `Clock` (sanctioned `createSystemClock()` at the
  composition root).

## Forbidden

- Accessing `Seed`, `RootIdentity`, or recovery material. The service never
  touches these types directly (MASTER_SYSTEM 2.1, Phase 1 rules).
- One static key for the whole conversation. Per-session chain keys + per-
  message keys via HKDF, with ratchet-on-every-use.
- Plaintext persistence anywhere (MASTER_SYSTEM 2.2).
- Direct `localStorage` / `sessionStorage` / `indexedDB`. None used; ESLint
  blocks them.
- Identity fields in the outer envelope. The outer envelope is strictly
  `{ v, sessionId, counter, nonce, ciphertext }`.
- Read receipts, typing indicators, online/last-seen, persistent chat
  history (MASTER_SYSTEM 12).
- Contact discovery, global user search, centralized conversation mapping
  (MASTER_SYSTEM 12).
- Calling `NetworkModule` directly. Transport integration is Phase 4.
- Logging. This module emits no log lines.

## Dependencies

- `@anonym-messenger/security` (`SecureMemory`, `HKDF`, `AEAD`,
  `Redaction`).
- `@anonym-messenger/types` (envelope types, `OpaqueId`, `Ephemeral`,
  `Timestamp`).
- `@anonym-messenger/utils` (`Clock` — via `createSystemClock()`).
- MUST NOT import from: `identity`, `network`, `monetization`, `community`,
  `anonymity`.

## Data Access Rules

- All state is in-memory (`SessionStoreService`, `ReplayGuardService`).
  Phase 2 does not persist anything, not even through `SafeStorage`.
- No message content, peer list, conversation id, room id, or metadata is
  written to any sink.
- Errors are terse and contain no key / nonce / plaintext fragments. They
  still pass through `Redaction` when logged by a future layer.

## Public API (`MessagingService`)

```ts
generateSessionSalt(): Uint8Array                         // 16B CSPRNG

openSession(
  sharedSecret: SecureMemory,
  role: SessionRole,
  opts: { sessionSalt: Uint8Array; ttlMs?: number; ttlJitterRatio?: number }
): MessageSessionDescriptor

seal(input: { sessionId, contentType, body, sentAt? })
  : MessageOuterEnvelope

open(envelope: MessageOuterEnvelope)
  : Ephemeral<MessageInnerEnvelope>

destroySession(descriptor: MessageSessionDescriptor): void
destroyAll(): void
```

`sessionSalt` is REQUIRED and 16 bytes. The initiator produces it with
`generateSessionSalt()` and delivers it to the responder via the
out-of-scope handshake layer. It is NEVER placed on the wire.

## Envelope shapes (wire)

```
MessageOuterEnvelope = {
  v:          1
  sessionId:  OpaqueId<'message-session'>   // HKDF-derived; no identity
  counter:    MessageCounter                // BE32; strictly monotonic / direction
  nonce:      Uint8Array(12)                // HKDF-derived from chainKey_n
  ciphertext: Uint8Array                    // ChaCha20-Poly1305 body + 16B tag
}

MessageInnerEnvelope (after open) = {
  v:           1
  sentAt:      Timestamp
  contentType: string
  body:        Ephemeral<Uint8Array>
}
```

## Derivation scheme v1 (hardened)

```
extractSalt     = SESSION_SALT_PREFIX || sessionSalt          (16B random, OFF-WIRE)
PRK             = HKDF-Extract(extractSalt, sharedSecret)
chain_initiator = HKDF-Expand(PRK, "am/messaging/v1/chain|initiator", 32)
chain_responder = HKDF-Expand(PRK, "am/messaging/v1/chain|responder", 32)
sessionId       = base64url( HKDF-Expand(PRK, "am/messaging/v1/session-id", 16) )
nonceSalt       = HKDF-Expand(PRK, "am/messaging/v1/nonce-salt", 8)            (OFF-WIRE)
counterStart_*  = HKDF-Expand(PRK, "am/messaging/v1/counter-start|<role>", 4)
                  & 0x00ffffff                               (non-zero-based sequences)

msgKey_n        = HKDF-Expand(chainKey_n,
                              "am/messaging/v1/msg-key|"   || BE32(n), 32)
nonce_n         = HKDF-Expand(chainKey_n,
                              "am/messaging/v1/msg-nonce|" || nonceSalt || BE32(n), 12)
chainKey_{n+1}  = HKDF-Expand(chainKey_n, "am/messaging/v1/chain-ratchet", 32)
```

Per-session random `sessionSalt` (16 B) defeats any determinism from
`sharedSecret` reuse across sessions. `nonceSalt` threads additional
per-session entropy into every nonce. `counterStart_*` makes the first
observed counter on the wire random per direction. `expiresAtMs` is
further jittered by a CSPRNG-sampled offset in `±(ttlMs * jitterRatio)` at
`MessagingService.openSession` time, so session expirations do not form
uniform timing patterns.

None of `sessionSalt`, `nonceSalt`, or the counter start offsets ever
appear in the outer envelope.

Sealing ratchets the send chain; opening ratchets the recv chain. Old
chain keys are zeroed on replacement. Leaking any `chainKey_n` does not
reveal past message keys (forward secrecy via one-way HKDF).

## What is deferred to later phases

- Double Ratchet (future secrecy on compromise): Phase 3.
- Skipped-key cache for out-of-order delivery: Phase 3/4.
- ECDH handshake that produces `sharedSecret` from two `DerivedIdentity`
  peers: Phase 3 / network layer.
- Header encryption / padding / cover traffic: Phase 4.
- Transport integration (WebSocket, onion routing): Phase 4.
- Persistent (encrypted) message storage IF explicitly requested by a
  feature: requires audit; default remains ephemeral.
- Group messaging, multi-device fan-out: not on the roadmap without a
  dedicated audit.
