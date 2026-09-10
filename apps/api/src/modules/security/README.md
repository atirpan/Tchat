# Security module

Reference: MASTER_SYSTEM section 3, section 4 (Security).

Acts as a **global layer**. Marked `@Global()` in Nest so that future
security primitives can be provided once and injected across modules without
creating module-to-module back-edges.

## Responsibilities

- Provide device- and process-level protections as app-wide services.
- Own the surface for: screenshot blocking, memory clearing, fake UI mode
  (Phase 3).
- Provide a single place where sensitive data crosses trust boundaries.

## Allowed

- Exposing providers that wrap `SecureMemory`, `Redaction`, `SafeStorage`.
- Registering global guards/interceptors that STRIP or REDACT outbound data.

## Forbidden

- Storing plaintext secrets.
- Introducing insecure shortcuts or "temporary" weakenings for performance
  (MASTER_SYSTEM 2.5).
- Reducing encryption strength for any reason (MASTER_SYSTEM 2.5).
- Acting as a feature module — this is a layer, not a feature.

## Dependencies

- `@anonym-messenger/security` (primary consumer of the package).
- MUST NOT import from any feature module. Feature modules consume from
  SecurityModule, not the other way around.

## Data Access Rules

- MUST NOT own any persistent store directly; owns the CONTRACT (`SafeStorage`)
  and the providers that implement it.
- MUST ensure any error emitted through global filters is passed through
  `redactObject` before reaching any sink.

Phase 0: empty `@Global()` shell.

### Redaction surface (Phase 0b)

`@anonym-messenger/security` exposes `redactObject` / `redactValue` plus an
`ALWAYS_REDACT_KEYS` set that any module reaching a log, error, or
serialized-response sink MUST pass its payload through. The current set
covers credentials, device/network metadata, personal identifiers, message
content, and correlation surfaces (`session`, `sessionId`, `conversationId`,
`peerId`, `roomId`, `metadata`, `payload`, `headers`). Add — never remove —
keys here as new surfaces appear.
