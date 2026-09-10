# Anonym Messenger

Privacy-first, anonymity-focused communication system.

> Current authority: [user-supplied v6.0 specification](./docs/MASTER_v6_0.docx).
> **Incomplete; not ready for public launch.** See [current implementation status](./docs/IMPLEMENTATION_STATUS.md) and [108-module inventory](./docs/module-inventory.json).
>
> The original scaffold description below is historical. Secret-bearing identity/messaging code now lives in the test-only `packages/reference-client`, excluded from the server. Rust client foundations live in `crates/`, including policy, secure-memory, provider-negotiation and exact-match alias contracts. An Expo Go test client is under `apps/mobile`; native production protocols remain incomplete. Current toolchain is Node 24.19.0, pnpm 11.19.0 and Rust 1.98.1. Use `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm rust:test`, `pnpm rust:lint`; `pnpm launch:check` intentionally fails until release requirements are verified.

## Historical scaffold status

| Phase | Name               | State       |
| ----- | ------------------ | ----------- |
| 0     | Foundation         | in progress |
| 1     | Identity           | not started |
| 2     | Messaging          | not started |
| 3     | Security           | not started |
| 4     | Network            | not started |
| 5     | Monetization       | not started |
| 6     | Community          | not started |
| 7     | Advanced Anonymity | not started |

No business logic is implemented yet. This repository currently contains only
the monorepo skeleton, module placeholders, linting/formatting/testing config,
environment templates and architecture guardrails.

## Stack (locked)

- Monorepo: **pnpm + turbo**
- Backend app: **NestJS + TypeScript** (`apps/api`)
- Frontend app: **Next.js + TypeScript** (`apps/web`)
- Shared packages: `config`, `types`, `security`, `utils`
- Forbidden: MongoDB, FastAPI, analytics/tracking SDKs, crash reporters sending user data

## Layout

```
.
├── apps/
│   ├── api/          NestJS backend (modular monolith)
│   └── web/          Next.js frontend
├── packages/
│   ├── config/       shared runtime/build config
│   ├── types/        shared TypeScript contracts
│   ├── security/     primitives (no plaintext secrets)
│   └── utils/        pure helpers
├── docs/             architecture, rules, security, anonymity notes
├── turbo.json        task pipeline
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Local workflow (once dependencies are installed)

```bash
pnpm install
pnpm dev          # runs all apps in parallel (turbo)
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

> Dependencies are intentionally **not installed** during Phase 0 scaffolding
> to keep the foundation reviewable. Run `pnpm install` when Phase 1 begins.

## Rules

See [`docs/RULES.md`](./docs/RULES.md) and [`docs/MASTER_SYSTEM.md`](./docs/MASTER_SYSTEM.md).
The final rule applies to every change:

> If any feature increases traceability, increases stored data, or reduces
> anonymity — **do not implement**.
