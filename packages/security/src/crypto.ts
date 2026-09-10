/**
 * Low-level cryptographic primitives.
 *
 * Thin wrappers over `node:crypto` so callers never touch the raw API
 * directly. Functions here are the ONLY place in the codebase that imports
 * `node:crypto`; ESLint `no-restricted-imports` should forbid it elsewhere
 * in later phases.
 *
 * Intentionally minimal. No key protocols, no signatures, no AEAD yet —
 * those arrive with Phase 2 / 3 under audit. This file exists to serve
 * Phase 1 Identity derivation only.
 *
 * MASTER_SYSTEM references: 2.5, 2.7 (no third-party crypto without audit),
 * 5 (sensitive data short-lived), 11 (no plaintext sensitive data).
 */

import {
  createHash,
  createHmac,
  randomBytes as nodeRandomBytes,
  timingSafeEqual as nodeTimingSafeEqual,
} from 'node:crypto';

/** CSPRNG bytes. Uses the platform CSPRNG; never `Math.random`. */
export function randomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length <= 0 || length > 1024) {
    throw new RangeError(`randomBytes: length out of bounds: ${length}`);
  }
  const buf = nodeRandomBytes(length);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/** SHA-256 digest. 32 bytes. */
export function sha256(input: Uint8Array): Uint8Array {
  const h = createHash('sha256');
  h.update(input);
  const d = h.digest();
  return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
}

/** SHA-512 digest. 64 bytes. */
export function sha512(input: Uint8Array): Uint8Array {
  const h = createHash('sha512');
  h.update(input);
  const d = h.digest();
  return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
}

/** HMAC-SHA512. 64 bytes. */
export function hmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array {
  const h = createHmac('sha512', key);
  h.update(data);
  const d = h.digest();
  return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
}

/**
 * Constant-time equality check. Returns false on length mismatch without
 * revealing it (a length-mismatch branch is acceptable; the bytes themselves
 * are compared in constant time).
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  return nodeTimingSafeEqual(a, b);
}

/** Overwrite a Uint8Array with zero. Best-effort RAM hygiene. */
export function zeroize(view: Uint8Array): void {
  view.fill(0);
}
