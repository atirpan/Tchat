/**
 * Boot mode resolution for apps/api.
 *
 * Phase 0 supports exactly two modes:
 *
 *   - `standalone` : construct the module graph and exit. No network surface,
 *                    no listener, no request handling. This is the ONLY mode
 *                    allowed in Phase 0.
 *
 *   - `http`       : reserved for Phase 1+. Will bind a loopback HTTP listener
 *                    AFTER an audit approves the identity and security
 *                    primitives. Using this mode in Phase 0 throws.
 *
 * MASTER_SYSTEM references:
 *   - section 2.5: no insecure shortcuts, no temporary insecure solutions
 *   - section 2.8: decision boundaries (introducing a new surface needs audit)
 *   - section 10: task execution protocol (explicit, controlled changes)
 */
export const BOOT_MODES = ['standalone', 'http'] as const;
export type BootMode = (typeof BOOT_MODES)[number];

export const DEFAULT_BOOT_MODE: BootMode = 'standalone';

export class UnknownBootModeError extends Error {
  constructor(received: string) {
    super(`Unknown BOOT_MODE "${received}". Allowed values: ${BOOT_MODES.join(', ')}.`);
    this.name = 'UnknownBootModeError';
  }
}

export class BootModeNotYetAllowedError extends Error {
  constructor(mode: BootMode, reason: string) {
    super(`BOOT_MODE "${mode}" is not allowed in the current phase: ${reason}`);
    this.name = 'BootModeNotYetAllowedError';
  }
}

/**
 * Resolve the boot mode from an environment bag.
 *
 * We deliberately accept an arbitrary `Record<string, string | undefined>` so
 * the caller (usually `process.env`) is injected, not read directly. This
 * keeps the function pure and testable, and avoids hidden global reads.
 */
export function resolveBootMode(env: Record<string, string | undefined>): BootMode {
  const raw = (env['BOOT_MODE'] ?? '').trim();
  if (raw.length === 0) {
    return DEFAULT_BOOT_MODE;
  }
  if ((BOOT_MODES as readonly string[]).includes(raw)) {
    return raw as BootMode;
  }
  throw new UnknownBootModeError(raw);
}
