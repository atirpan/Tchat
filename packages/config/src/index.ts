/**
 * @anonym-messenger/config
 *
 * Shared configuration helpers. Phase 0 exposes:
 *   - PHASE marker
 *   - Phase type
 *   - Environment-mode helper (non-identifiable)
 *
 * This package MUST NOT read from `process.env` on import. Callers inject
 * the env bag explicitly so tests and server/client contexts stay pure.
 */
export const PHASE = 0 as const;

export type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type NodeEnvMode = 'development' | 'test' | 'production';

export function resolveNodeEnv(env: Record<string, string | undefined>): NodeEnvMode {
  const raw = (env['NODE_ENV'] ?? 'development').trim();
  if (raw === 'production' || raw === 'test' || raw === 'development') {
    return raw;
  }
  return 'development';
}

export const IS_PHASE_0 = true as const;
