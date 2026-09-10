export type AliasValidation =
  | { ok: true; normalized: string }
  | { ok: false; reason: 'empty' | 'length' | 'character' | 'reserved' };

const RESERVED = new Set(['admin', 'administrator', 'anonim', 'anonymous', 'support', 'system']);

/** Mirrors the Rust alias policy until the native core is connected. */
export function validateAlias(input: string): AliasValidation {
  if (input.length === 0) return { ok: false, reason: 'empty' };
  if (input.length < 3 || input.length > 64) return { ok: false, reason: 'length' };
  if (!/^[A-Za-z0-9_.-]+$/u.test(input)) return { ok: false, reason: 'character' };
  const normalized = input.toLowerCase();
  if (RESERVED.has(normalized)) return { ok: false, reason: 'reserved' };
  return { ok: true, normalized };
}
