# Phases

Locked order (MASTER_SYSTEM §9). No phase may start before the previous one is
audited.

| Phase | Name                 | Status       | Entry gate                              |
| ----- | -------------------- | ------------ | --------------------------------------- |
| 0     | Foundation           | audited      | —                                       |
| 1     | Identity             | audited      | Phase 0 audit approval                  |
| 2     | Messaging            | in progress  | Phase 1 audit approval                  |
| 3     | Security             | blocked      | Phase 2 audit approval                  |
| 4     | Network              | blocked      | Phase 3 audit approval                  |
| 5     | Monetization         | blocked      | Phase 4 audit approval                  |
| 6     | Community            | blocked      | Phase 5 audit approval                  |
| 7     | Advanced Anonymity   | blocked      | Phase 6 audit approval                  |

## Phase 0 — Foundation (audited)

Scope: monorepo, NestJS placeholder, Next.js placeholder, shared packages,
lint/format/test scaffolding, `.env.example`, docs, architecture guardrails
(BOOT_MODE, Redaction, Clock mandate, CSP, module isolation).

## Phase 1 — Identity (audited)

Scope: CSPRNG seed + checksum recovery string, HKDF-SHA512 derivation tree
(seed → root PRK → per-context derived PRK → public fingerprint), real
`SecureMemory` + `createRamSafeStorage(clock)`, versioned HKDF constants,
deterministic + unlinkable derivation tests.

## Phase 2 — Messaging (in progress)

Scope:

- ChaCha20-Poly1305 AEAD in `@anonym-messenger/security` (minimal
  extension).
- Envelope types in `@anonym-messenger/types`: `MessageOuterEnvelope`
  (minimal, no identity), `MessageInnerEnvelope` (ephemeral body),
  `MessageSessionId`, `MessageCounter`, `SessionRole`.
- Messaging module with: `MessageDerivationService` (HKDF chain + per-
  message key + nonce + ratchet), `ReplayGuardService` (per-session
  bounded-window counter set), `SessionStoreService` (in-RAM state with
  Clock-enforced expiry), `MessageSealService`, `MessageOpenService`,
  `MessagingService` (public API).
- Relation binding by `sharedSecret` + `role`. Phase 2 does NOT run the
  handshake; the caller supplies the secret.
- Ephemeral by default. No persistence. No identity fields on the wire.
- Tests: round-trip (both directions), replay rejection, tamper
  (ciphertext + AAD) rejection, cross-session isolation, sentAt sanity,
  destroy wipes state, outer envelope carries no identity fields.

Out of scope (deferred):

- Double Ratchet (future secrecy on compromise) — Phase 3.
- Skipped-key cache for out-of-order delivery beyond the current window —
  Phase 3 / 4.
- ECDH handshake turning two `DerivedIdentity` peers into `sharedSecret` —
  Phase 3 / network.
- Transport (WebSocket / onion / cover traffic) — Phase 4.
- Persistent encrypted message storage — requires audit.
- Group messaging, multi-device fan-out — not on the roadmap without a
  dedicated audit.
