/**
 * IdentityService
 *
 * High-level API composed over `SeedService` + `DerivationService` +
 * `SafeStorage`. This is the only surface that feature modules (Messaging
 * in Phase 2) should interact with.
 *
 * Public surface:
 *   - createSession()              → new seed, stored ephemerally
 *   - restoreSession(recovery)     → from a user-provided recovery string
 *   - identityFor(context)         → derived identity for a relationship
 *   - exportRecovery()             → recovery string for the current seed
 *   - destroy()                    → wipe the session
 *
 * What this service NEVER does:
 *   - Log identifiers, fingerprints, or any derivation input.
 *   - Persist to disk (only RAM SafeStorage in Phase 1).
 *   - Export the root or any private material outside SecureMemory.
 *   - Accept personal data (no email, phone, name, device id).
 *
 * MASTER_SYSTEM: 2.1, 2.2, 2.3, 5, 6, 12.
 */
import type { SafeStorage } from '@anonym-messenger/security';
import type {
  DerivedIdentity,
  IdentityContext,
  RecoveryString,
  RootIdentity,
} from '@anonym-messenger/types';
import { Inject, Injectable } from '@nestjs/common';

import { DEFAULT_SEED_TTL_MS, STORAGE_KEY_SEED } from './constants';
import { DerivationService } from './derivation.service';
import { SeedService } from './seed.service';

export const SAFE_STORAGE_TOKEN = Symbol('identity:safe-storage');

export class NoActiveIdentitySessionError extends Error {
  constructor() {
    super('No active identity session. Call createSession or restoreSession first.');
    this.name = 'NoActiveIdentitySessionError';
  }
}

@Injectable()
export class IdentityService {
  /** In-memory reference to the active root. Never serialized. */
  #root: RootIdentity | null = null;

  constructor(
    private readonly seeds: SeedService,
    private readonly derivation: DerivationService,
    @Inject(SAFE_STORAGE_TOKEN) private readonly storage: SafeStorage,
  ) {}

  /**
   * Create a fresh anonymous session. Produces a new seed, derives the
   * root, and parks the seed in RAM-only SafeStorage with a TTL.
   *
   * Returns the recovery string ONCE. The caller MUST render it to the
   * user's screen and then drop the reference. The identity service does
   * not keep a plaintext copy.
   */
  async createSession(opts?: { ttlMs?: number }): Promise<RecoveryString> {
    this.#resetRoot();
    const ttlMs = opts?.ttlMs ?? DEFAULT_SEED_TTL_MS;
    const seed = this.seeds.generate();
    try {
      await seed.withBytes(async (bytes) => {
        await this.storage.put(STORAGE_KEY_SEED, bytes, { ttlMs, ramOnly: true });
      });
      this.#root = this.derivation.deriveRoot(seed);
      return this.seeds.toRecoveryString(seed);
    } finally {
      // Seed bytes were copied into storage and into the root's master PRK;
      // we no longer need the original handle.
      seed.zero();
    }
  }

  /**
   * Restore a session from a user-supplied recovery string. Throws
   * `InvalidRecoveryStringError` on any parse / checksum failure.
   */
  async restoreSession(recovery: RecoveryString, opts?: { ttlMs?: number }): Promise<void> {
    this.#resetRoot();
    const ttlMs = opts?.ttlMs ?? DEFAULT_SEED_TTL_MS;
    const seed = this.seeds.fromRecoveryString(recovery);
    try {
      await seed.withBytes(async (bytes) => {
        await this.storage.put(STORAGE_KEY_SEED, bytes, { ttlMs, ramOnly: true });
      });
      this.#root = this.derivation.deriveRoot(seed);
    } finally {
      seed.zero();
    }
  }

  /**
   * Produce a derived identity for the given relationship context. Same
   * `(session, context)` returns a fingerprint that is byte-for-byte
   * identical across calls (determinism). Different contexts are
   * cryptographically unlinkable.
   */
  identityFor(context: IdentityContext): DerivedIdentity {
    if (!this.#root) throw new NoActiveIdentitySessionError();
    return this.derivation.deriveForContext(this.#root, context);
  }

  /**
   * Emit the recovery string for the currently-active session. Throws if no
   * session exists. Fails to an expired seed (TTL) with
   * `NoActiveIdentitySessionError`.
   */
  async exportRecovery(): Promise<RecoveryString> {
    if (!this.#root) throw new NoActiveIdentitySessionError();
    const seedSm = await this.storage.get(STORAGE_KEY_SEED);
    if (!seedSm) {
      this.#resetRoot();
      throw new NoActiveIdentitySessionError();
    }
    try {
      return this.seeds.toRecoveryString(seedSm);
    } finally {
      seedSm.zero();
    }
  }

  /**
   * Drop the in-memory root and wipe all identity-owned SafeStorage entries.
   * Idempotent.
   */
  async destroy(): Promise<void> {
    this.#resetRoot();
    await this.storage.delete(STORAGE_KEY_SEED);
  }

  #resetRoot(): void {
    if (this.#root) {
      this.#root.destroy();
      this.#root = null;
    }
  }
}
