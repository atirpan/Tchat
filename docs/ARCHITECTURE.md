# Architecture

Anonym Messenger starts as a **modular monolith**. Microservices are explicitly
forbidden at this stage (MASTER_SYSTEM §3).

## Monorepo topology

```
apps/
  api/   NestJS HTTP + WebSocket surface (not yet exposed)
  web/   Next.js UI (App Router)
packages/
  config/    shared build/runtime config helpers
  types/     shared TypeScript contracts between api and web
  security/  security primitives (key/crypto wrappers — empty in Phase 0)
  utils/     pure, side-effect-free helpers
```

## Module graph (backend)

```
security (global layer)
   |
   +-- identity  ---\
   |                 \
   +-- anonymity -----+-- messaging --- network
   |                 /
   +-- monetization-/
   |
   +-- community
```

Rules (from MASTER_SYSTEM §3.2):

- Identity MUST NOT leak into Messaging
- Messaging MUST NOT control Network
- Monetization MUST NOT access Identity
- UI MUST NOT expose sensitive data
- Security acts as a global layer

These are enforced at review time. No dependency injection is wired between
modules in Phase 0; only placeholders exist.

## Why NestJS + Next.js

- NestJS gives first-class module boundaries, matching the §3 contract.
- Next.js App Router allows server-only code paths for anything touching
  secrets, without shipping them to the client.
- Both are TypeScript-native, enabling `packages/types` as the single contract.

## Why pnpm + turbo

- pnpm workspaces keep a strict, content-addressed dep graph — no phantom deps
  across modules (supports §3.2 isolation).
- turbo caches only build artifacts, never user data.

## What is explicitly NOT here yet

- No database client (neither SQL nor Mongo). Persistence decisions are
  deferred until Phase 2. Per §2.2, storage must be justified before added.
- No auth, no identity endpoints, no crypto code.
- No analytics, telemetry, crash reporting.
- No third-party SDKs beyond runtime frameworks.
