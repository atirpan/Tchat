# @anonym-messenger/utils

Pure, side-effect-free helpers.

## Clock is mandatory

All time-dependent code in the repository MUST receive a `Clock` (or an
equivalent injected time-access function). Direct wall-clock reads are
forbidden outside `packages/utils/src/index.ts`.

```ts
import { createClock, createFrozenClock } from '@anonym-messenger/utils';

// Production composition root — the ONE sanctioned Date.now reference:
const clock = createClock(() => Date.now());

// Tests and deterministic code paths:
const frozen = createFrozenClock(asTimestamp(1_700_000_000_000));
```

Forbidden everywhere else (enforced by ESLint + the
`apps/api/test/clock-usage.spec.ts` guardrail):

- `Date.now()`
- `new Date()` (unparameterized)
- `performance.now()`
- reading any global timer directly

Rationale: uncontrolled wall-clock reads are a behavioural fingerprint
source (MASTER_SYSTEM §6) and a timing side-channel (§5). Centralising time
behind `Clock` lets later phases add jitter / coarse-grained quantisation /
test freezing in one audited place.

## Package rules

- Functions here MUST be deterministic and have no I/O.
- No global state.
- No logging. No telemetry.
