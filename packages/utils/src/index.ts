/**
 * @anonym-messenger/utils
 *
 * Pure helpers only. Functions here MUST:
 *   - be deterministic
 *   - have no I/O
 *   - have no global state
 *
 * -------------------------------------------------------------------------
 * Clock contract (mandatory — MASTER_SYSTEM 6)
 * -------------------------------------------------------------------------
 *
 * ALL time-dependent code in this repository MUST receive a `Clock` (or an
 * injected time-access function) as a parameter / constructor argument /
 * provider binding. The following are FORBIDDEN at module scope anywhere
 * outside this file:
 *
 *   - `Date.now()`
 *   - `new Date()`            (unparameterized)
 *   - `performance.now()`     (equivalent side-channel)
 *   - reading any global timer directly
 *
 * Enforcement:
 *   1. ESLint `no-restricted-syntax` denies these patterns repo-wide.
 *   2. `apps/api/test/clock-usage.spec.ts` scans the source tree and fails
 *      if any forbidden usage slips past the lint (e.g. via a pragma).
 *   3. PR checklist in `docs/RULES.md`.
 *
 * Why: uncontrolled wall-clock reads are a behavioural fingerprint source
 * and make tests non-deterministic. Centralising time behind `Clock` lets
 * later phases apply jitter, coarse-grained quantisation, or frozen time
 * in tests without touching callers. MASTER_SYSTEM 6 requires that
 * "behaviour must not be predictable" — uncontrolled clocks defeat that.
 *
 * The ONLY place in the codebase where `Date.now` (or equivalent) may be
 * referenced is the implementation of a `Clock` inside this package. All
 * other modules receive a `Clock` from their composition root.
 */

import type { Timestamp } from '@anonym-messenger/types';
import { asTimestamp } from '@anonym-messenger/types';

export const noop = (): void => {
  /* intentional */
};

export interface Clock {
  now(): Timestamp;
}

/**
 * Build a `Clock` from an injected `nowMs` function.
 *
 * This function does NOT read the wall clock itself. The caller supplies a
 * time source, which means:
 *   - in production, the composition root passes `() => Date.now()` ONCE
 *     (this is the only sanctioned reference to `Date.now` in the entire
 *     codebase, and it lives at the root, not inside feature modules);
 *   - in tests, a frozen / controllable source is passed instead.
 */
export function createClock(nowMs: () => number): Clock {
  return {
    now: () => asTimestamp(nowMs()),
  };
}

/**
 * The ONE sanctioned system-clock factory. Every composition root that
 * needs the wall clock MUST call this, never `createClock(() => Date.now())`
 * inline. Concentrating the reference here keeps the
 * `clock-usage.spec.ts` allowlist at a single file.
 */
export function createSystemClock(): Clock {
  return createClock(() => Date.now());
}

/**
 * Convenience: a frozen `Clock` for tests and deterministic code paths.
 * Never use this in production.
 */
export function createFrozenClock(fixed: Timestamp): Clock {
  return {
    now: () => fixed,
  };
}
