# Security Notes (Phase 0)

Phase 0 intentionally ships **no cryptographic code**. This document records
the invariants future phases must preserve.

## Principles (MASTER_SYSTEM §5)

- All sensitive data must be short-lived.
- RAM must be cleared after use.
- No background exposure of secrets.
- No system-level leakage.
- File metadata must be removed before sending.

## Phase 0 guardrails already in place

- TypeScript `strict` everywhere, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes` — catches a class of memory-safety-adjacent
  bugs at compile time.
- ESLint rule blocks imports matching analytics / crash-reporter / tracking
  patterns (`.eslintrc.cjs` → `no-restricted-imports`).
- `.env` files are git-ignored. Only `.env.example` stubs are committed.
- No persistence layer is wired, so there is nothing that could accidentally
  store plaintext in Phase 0.
- No HTTP surface is exposed yet (API `main.ts` exits without binding a port
  in Phase 0).

## Deferred to later phases

- `packages/security` will own: key wrappers, memory-zeroing helpers, envelope
  encryption, file-metadata strippers.
- Screenshot blocking, fake UI mode, memory clearing: Phase 3.
- Network obfuscation: Phase 4.
