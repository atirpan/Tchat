# Anonym Messenger — PRD

> Governance: [`/app/docs/MASTER_SYSTEM.md`](../docs/MASTER_SYSTEM.md) is the
> highest authority. This PRD derives from it and never overrides it.

## Original problem statement

> You MUST follow ANONYM_MESSENGER_MASTER_SYSTEM.md as the highest authority.
> Read it completely before doing anything. Do not violate any rule. If a task
> conflicts, STOP and explain.

Follow-up locked decisions from the owner (2026-01):

- Current phase: **Phase 0 — Foundation only**
- Stack: pnpm + turbo monorepo, Next.js + TypeScript, NestJS + TypeScript
- Shared packages: config, types, security, utils
- Forbidden for this phase: MongoDB, FastAPI, identity logic, messaging
  logic, E2EE logic, monetization, payments, external integrations,
  analytics, tracking, crash reporting, centralized user mapping

## Architecture

Modular monolith on the backend (NestJS), SSR-capable frontend (Next.js App
Router). All modules are isolated shells in Phase 0 — no cross-module
dependencies exist yet.

```
apps/
  api/    NestJS — modules: identity, messaging, network, security,
          anonymity, monetization, community (all empty)
  web/    Next.js App Router — single Phase 0 landing page
packages/
  config/    shared config helpers
  types/     shared type contracts
  security/  security primitives (empty placeholder)
  utils/     pure helpers
docs/    MASTER_SYSTEM, ARCHITECTURE, RULES, SECURITY, ANONYMITY, MODULES, PHASES
```

## User personas

Phase 0 has no user-facing functionality. Personas for future phases (to be
refined under audit):

- **Anonymous contact**: wants to communicate without revealing identity,
  phone, email, name, or device. No account recovery, no contact discovery.
- **Anonymous supporter**: wants to optionally pay for premium features via
  tokens, with no linkage to any identity or message.

## Core (static) requirements

1. No personal identity is ever collected.
2. Messages are ephemeral by default.
3. No logging, tracking, analytics, or telemetry.
4. No IP / connection-metadata retention.
5. No payment-to-identity linkage.
6. No external service without security review.
7. Modular monolith; modules may not leak into each other.
8. Forbidden patterns (email/phone login, global user search, contact
   discovery, online/last-seen/read-receipts/typing indicators, persistent
   chat history, centralized identity mapping) must never appear.

## What has been implemented (Phase 0 — 2026-01)

- Monorepo root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`,
  `tsconfig.base.json`, `.editorconfig`, `.prettierrc`, `.eslintrc.cjs`
  (with restricted-imports guard blocking analytics/tracking SDKs),
  `.gitignore`, `.nvmrc`, `.env.example`, `LICENSE` (TBD).
- `apps/api` (NestJS): `main.ts` that constructs and closes the module graph
  without binding a port, `app.module.ts` that composes seven empty modules,
  one passing `app.module.spec.ts` guardrail test, per-module `README.md`.
- `apps/web` (Next.js): App Router layout + Phase 0 landing page, dark
  privacy-first styling, `robots: noindex`, telemetry disabled by default.
- `packages/{config,types,security,utils}`: typed empty placeholders with
  `package.json`, `tsconfig.json`, `src/index.ts`.
- `docs/`: MASTER_SYSTEM (mirrored), ARCHITECTURE, RULES (PR checklist),
  SECURITY, ANONYMITY, MODULES, PHASES.
- `.github/workflows/ci.yml`: format + lint + typecheck + test + build.

## Deferred (prioritized backlog)

### P0 — blocks Phase 1 entry gate

- Audit pass of Phase 0 by the Audit Agent.
- Run `pnpm install` locally and commit `pnpm-lock.yaml` only after audit.
- Decide whether the API binds a loopback listener in dev (currently it does
  not; that is intentional for Phase 0).

### P1 — Phase 1 (Identity)

- Anonymous key generation (system-generated, minimal, unlinkable).
- Identity derivation primitives in `packages/security`.
- No personal fields. No global identity surface.

### P2 — Phase 2+ features

- Messaging lifecycle (ephemeral by default).
- Network obfuscation.
- Device-level security (screenshot block, memory clearing, fake UI mode).
- Token-based monetization (no identity linkage).
- Community spam control (no persistent reputation).
- Advanced anonymity (writing-style masking, identity rotation).

## Rule compliance check (Phase 0)

| Area        | Status      | Notes                                                 |
| ----------- | ----------- | ----------------------------------------------------- |
| Identity    | compliant   | no collection, no types, no endpoints                 |
| Data        | compliant   | no persistence layer installed                        |
| Logging     | compliant   | Nest logger disabled, no analytics                    |
| Network     | compliant   | no listener bound, no IP handling                     |
| Security    | compliant   | no insecure shortcut; strict TS; restricted imports   |
| Monetization| compliant   | not implemented                                       |
| External    | compliant   | only framework deps declared (not yet installed)      |
| Architecture| compliant   | modular monolith, isolated shells                     |

## Next tasks

1. Await Phase 0 audit approval.
2. On approval, open Phase 1 ticket: "Anonymous identity key generation".
