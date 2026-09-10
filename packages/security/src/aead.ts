/**
 * Authenticated encryption primitives.
 *
 * Phase 2 adds exactly ONE AEAD: ChaCha20-Poly1305 (RFC 8439).
 *
 * This is the minimal extension to `@anonym-messenger/security` that the
 * Messaging core strictly requires to seal / open messages. No additional
 * ciphers, modes, or protocols are introduced. Higher-level protocols
 * (Double Ratchet, PQ hybrids, etc.) remain Phase 3+ under audit.
 *
 * Contract:
 *   - `key` is exactly 32 bytes.
 *   - `nonce` is exactly 12 bytes AND MUST be unique per (key, plaintext).
 *     Nonce uniqueness is the caller's responsibility; the Messaging
 *     derivation layer guarantees this by HKDF-deriving the nonce from the
 *     message counter.
 *   - `aad` is associated data that is authenticated but NOT encrypted. If
 *     tampered with, open() throws.
 *   - `aead.seal` returns `ciphertext || tag` (a single buffer, 16-byte
 *     Poly1305 tag appended). This matches libsodium / WebCrypto layout.
 *   - `aead.open` verifies the tag in constant time. Throws on any failure;
 *     never returns partial / malleable plaintext.
 *
 * MASTER_SYSTEM references: 2.5 (no insecure shortcut), 5 (no system-level
 * leakage), 11 (no plaintext sensitive data in errors).
 */

import {
  createCipheriv,
  createDecipheriv,
  type CipherChaCha20Poly1305,
  type DecipherChaCha20Poly1305,
} from 'node:crypto';

export const AEAD_KEY_BYTES = 32;
export const AEAD_NONCE_BYTES = 12;
export const AEAD_TAG_BYTES = 16;

export class AeadError extends Error {
  constructor(reason: string) {
    // Deliberately terse. Never include key, nonce, or plaintext fragments
    // in the message — they would cross a trust boundary through the stack
    // trace (MASTER_SYSTEM 5, 11).
    super(`AEAD failure: ${reason}`);
    this.name = 'AeadError';
  }
}

export interface AeadSealInput {
  key: Uint8Array;
  nonce: Uint8Array;
  plaintext: Uint8Array;
  aad: Uint8Array;
}

export interface AeadOpenInput {
  key: Uint8Array;
  nonce: Uint8Array;
  /** `ciphertext || tag` as produced by `seal`. */
  sealed: Uint8Array;
  aad: Uint8Array;
}

function validateKeyNonce(key: Uint8Array, nonce: Uint8Array): void {
  if (key.byteLength !== AEAD_KEY_BYTES) throw new AeadError('bad key length');
  if (nonce.byteLength !== AEAD_NONCE_BYTES) throw new AeadError('bad nonce length');
}

/**
 * Seal `plaintext` under `key` with `nonce`, authenticating `aad`.
 * Returns `ciphertext || tag`.
 */
export function aeadSeal(input: AeadSealInput): Uint8Array {
  validateKeyNonce(input.key, input.nonce);
  let cipher: CipherChaCha20Poly1305;
  try {
    cipher = createCipheriv('chacha20-poly1305', input.key, input.nonce, {
      authTagLength: AEAD_TAG_BYTES,
    });
  } catch {
    throw new AeadError('cipher init failed');
  }
  cipher.setAAD(input.aad, { plaintextLength: input.plaintext.byteLength });
  const head = cipher.update(input.plaintext);
  const tail = cipher.final();
  const tag = cipher.getAuthTag();
  const out = new Uint8Array(head.byteLength + tail.byteLength + tag.byteLength);
  out.set(head, 0);
  out.set(tail, head.byteLength);
  out.set(tag, head.byteLength + tail.byteLength);
  return out;
}

/**
 * Verify and decrypt a `ciphertext || tag` blob. Throws `AeadError` on any
 * tamper / wrong-key / wrong-nonce / wrong-aad condition.
 */
export function aeadOpen(input: AeadOpenInput): Uint8Array {
  validateKeyNonce(input.key, input.nonce);
  if (input.sealed.byteLength < AEAD_TAG_BYTES) throw new AeadError('sealed too short');
  const tagStart = input.sealed.byteLength - AEAD_TAG_BYTES;
  const ct = input.sealed.subarray(0, tagStart);
  const tag = input.sealed.subarray(tagStart);
  let decipher: DecipherChaCha20Poly1305;
  try {
    decipher = createDecipheriv('chacha20-poly1305', input.key, input.nonce, {
      authTagLength: AEAD_TAG_BYTES,
    });
  } catch {
    throw new AeadError('decipher init failed');
  }
  decipher.setAAD(input.aad, { plaintextLength: ct.byteLength });
  decipher.setAuthTag(tag);
  const head = decipher.update(ct);
  let tail: Buffer | undefined;
  try {
    tail = decipher.final();
    const out = new Uint8Array(head.byteLength + tail.byteLength);
    out.set(head, 0);
    out.set(tail, head.byteLength);
    return out;
  } catch {
    throw new AeadError('authentication failed');
  } finally {
    head.fill(0);
    tail?.fill(0);
  }
}
