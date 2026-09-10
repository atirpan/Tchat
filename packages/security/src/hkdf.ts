/**
 * HKDF-SHA512 (RFC 5869).
 *
 * Two-step "extract then expand" pseudo-random key derivation. Used by the
 * Identity module to derive a master PRK from a seed and to produce
 * per-relationship derived PRKs without ever reusing the same key across
 * contexts.
 *
 * Domain separation: every caller passes a distinct `info` byte string that
 * begins with a versioned ASCII tag. This is how we guarantee that two
 * different derivation purposes can never accidentally collide.
 *
 * MASTER_SYSTEM references: 2.5 (no insecure shortcut), 6 (unlinkability).
 */

import { hmacSha512 } from './crypto';

const HASH_LEN = 64; // SHA-512 output length in bytes.

/**
 * HKDF-Extract: compress an arbitrary-length input keying material (IKM)
 * into a fixed-length pseudo-random key (PRK).
 */
export function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Uint8Array {
  // RFC 5869 §2.2: if salt not provided, use HashLen zero bytes.
  const effectiveSalt = salt.byteLength === 0 ? new Uint8Array(HASH_LEN) : salt;
  return hmacSha512(effectiveSalt, ikm);
}

/**
 * HKDF-Expand: turn a PRK into `length` pseudo-random bytes labelled by
 * `info`. `length` must be ≤ 255 * HashLen.
 */
export function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  if (!Number.isInteger(length) || length <= 0 || length > 255 * HASH_LEN) {
    throw new RangeError(`hkdfExpand: length out of bounds: ${length}`);
  }
  const n = Math.ceil(length / HASH_LEN);
  const out = new Uint8Array(n * HASH_LEN);
  let prev: Uint8Array = new Uint8Array(0);
  try {
    for (let i = 1; i <= n; i++) {
      const block = new Uint8Array(prev.byteLength + info.byteLength + 1);
      try {
        block.set(prev, 0);
        block.set(info, prev.byteLength);
        block[prev.byteLength + info.byteLength] = i;
        const t = hmacSha512(prk, block);
        prev.fill(0);
        prev = t;
        out.set(t, (i - 1) * HASH_LEN);
      } finally {
        block.fill(0);
      }
    }
    return out.slice(0, length);
  } finally {
    prev.fill(0);
    out.fill(0);
  }
}

/** Convenience: extract-then-expand in one call. */
export function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Uint8Array {
  const prk = hkdfExtract(salt, ikm);
  try {
    return hkdfExpand(prk, info, length);
  } finally {
    prk.fill(0);
  }
}
