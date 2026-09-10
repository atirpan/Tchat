/**
 * SeedService
 *
 * Responsibilities:
 *   - Generate a high-entropy seed (CSPRNG).
 *   - Encode / decode a seed to a recovery string (base64url + checksum).
 *
 * Out of scope:
 *   - BIP39-style human-readable mnemonic. The "or equivalent" allowance in
 *     the Phase 1 spec is satisfied by a compact, checksum-protected
 *     recovery string. A BIP39 upgrade may be introduced later under audit.
 *   - Any persistence. Storing a seed is the caller's decision and goes
 *     through `SafeStorage` with an explicit TTL.
 *
 * MASTER_SYSTEM: 2.1 (no personal identity), 2.5 (no insecure shortcut),
 * 5 (sensitive data short-lived), 11 (no plaintext).
 */
import {
  constantTimeEqual,
  createSecureMemory,
  randomBytes,
  sha256,
  type SecureMemory,
  zeroize,
} from '@anonym-messenger/security';
import type { RecoveryString, Seed } from '@anonym-messenger/types';
import { asEphemeral } from '@anonym-messenger/types';
import { Injectable } from '@nestjs/common';

import { RECOVERY_CHECKSUM_BYTES, SEED_LENGTH } from './constants';

export class InvalidRecoveryStringError extends Error {
  constructor(reason: string) {
    super(`Invalid recovery string: ${reason}`);
    this.name = 'InvalidRecoveryStringError';
  }
}

@Injectable()
export class SeedService {
  /**
   * Produce a fresh, 32-byte CSPRNG seed wrapped in a `SecureMemory` handle.
   * Caller is responsible for destroying the handle when done.
   */
  generate(): SecureMemory {
    const raw = randomBytes(SEED_LENGTH);
    try {
      return createSecureMemory(raw);
    } finally {
      // Zero the transient buffer immediately. The SecureMemory owns its
      // own copy.
      zeroize(raw);
    }
  }

  /**
   * Encode a seed into a compact recovery string. Format:
   *
   *   base64url( seed(32) || sha256(seed).slice(0, 4) )
   *
   * Returns an `Ephemeral<string>` so the type system marks it as
   * must-not-persist. Callers displaying it to the user MUST drop the
   * reference as soon as the UI step completes.
   */
  toRecoveryString(seed: SecureMemory): RecoveryString {
    return seed.withBytes((bytes) => {
      if (bytes.byteLength !== SEED_LENGTH) {
        throw new RangeError(
          `SeedService.toRecoveryString: expected ${SEED_LENGTH} bytes, got ${bytes.byteLength}`,
        );
      }
      const check = sha256(bytes).slice(0, RECOVERY_CHECKSUM_BYTES);
      const packed = new Uint8Array(SEED_LENGTH + RECOVERY_CHECKSUM_BYTES);
      packed.set(bytes, 0);
      packed.set(check, SEED_LENGTH);
      const b64 = Buffer.from(packed).toString('base64url');
      // Best-effort scrub of the transient buffers.
      zeroize(packed);
      zeroize(check);
      return asEphemeral(b64);
    });
  }

  /**
   * Parse a recovery string back into a `Seed` carried by a `SecureMemory`.
   * Verifies the checksum in constant time to avoid revealing which byte
   * diverged. Throws `InvalidRecoveryStringError` on any problem.
   */
  fromRecoveryString(recovery: RecoveryString): SecureMemory {
    const str = recovery as unknown as string;
    if (typeof str !== 'string' || str.length === 0) {
      throw new InvalidRecoveryStringError('empty');
    }
    let packed: Uint8Array;
    try {
      const buf = Buffer.from(str, 'base64url');
      packed = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } catch {
      throw new InvalidRecoveryStringError('not valid base64url');
    }
    if (packed.byteLength !== SEED_LENGTH + RECOVERY_CHECKSUM_BYTES) {
      zeroize(packed);
      throw new InvalidRecoveryStringError('wrong length');
    }
    const seedBytes = packed.slice(0, SEED_LENGTH);
    const providedCheck = packed.slice(SEED_LENGTH);
    const expectedCheck = sha256(seedBytes).slice(0, RECOVERY_CHECKSUM_BYTES);
    const ok = constantTimeEqual(providedCheck, expectedCheck);
    zeroize(packed);
    zeroize(providedCheck);
    zeroize(expectedCheck);
    if (!ok) {
      zeroize(seedBytes);
      throw new InvalidRecoveryStringError('checksum mismatch');
    }
    try {
      return createSecureMemory(seedBytes);
    } finally {
      zeroize(seedBytes);
    }
  }

  /**
   * Type-level accessor. Exists so callers can narrow an arbitrary
   * `SecureMemory` value to the `Seed` brand without sprinkling `as`
   * assertions in feature code.
   */
  asSeedView(sm: SecureMemory): (fn: (seed: Seed) => void) => void {
    return (fn) =>
      sm.withBytes((bytes) => {
        fn(asEphemeral(bytes));
      });
  }
}
