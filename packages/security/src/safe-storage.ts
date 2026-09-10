/**
 * SafeStorage
 *
 * Contract for ephemeral-by-default storage. See docs/MODULE_RULES.md and
 * MASTER_SYSTEM 2.2, 2.4, 5, 12.
 *
 * Phase 1 ships ONE concrete implementation: `createRamSafeStorage(clock)`.
 * It keeps values exclusively in RAM, enforces TTLs using the injected
 * Clock, and hands reads back as `SecureMemory` handles. No disk access, no
 * IndexedDB, no cookies, no localStorage.
 *
 * Encrypted-on-disk storage remains a placeholder and throws. Any persistence
 * decision requires audit (section 2.2, 2.8).
 */

import type { Clock } from '@anonym-messenger/utils';

import { createSecureMemory, type SecureMemory } from './secure-memory';

export type TtlMs = number;

export interface SafeStoragePutOptions {
  /** Required. Maximum lifetime. */
  ttlMs: TtlMs;
  /**
   * If true, the implementation MUST NOT persist across process restarts.
   * The RAM implementation satisfies this trivially. Default: false.
   */
  ramOnly?: boolean;
}

export interface SafeStorage {
  put(key: string, value: Uint8Array, opts: SafeStoragePutOptions): Promise<void>;
  get(key: string): Promise<SecureMemory | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/* ------------------------------------------------------------------------- */
/* RAM implementation                                                        */
/* ------------------------------------------------------------------------- */

interface RamEntry {
  bytes: Uint8Array;
  expiresAtMs: number;
}

/**
 * In-memory, TTL-enforcing SafeStorage. Suitable for Phase 1 Identity key
 * material in ephemeral sessions.
 *
 * TTLs are checked on every `get`; expired entries are zeroed and removed.
 * This is best-effort; callers who need a hard upper bound on RAM residency
 * should still call `delete` / `clear` proactively.
 */
export function createRamSafeStorage(clock: Clock): SafeStorage {
  const store = new Map<string, RamEntry>();

  function wipeEntry(entry: RamEntry): void {
    entry.bytes.fill(0);
  }

  async function put(key: string, value: Uint8Array, opts: SafeStoragePutOptions): Promise<void> {
    if (!Number.isFinite(opts.ttlMs) || opts.ttlMs <= 0) {
      throw new RangeError('SafeStorage.put: ttlMs must be a positive finite number.');
    }
    const prev = store.get(key);
    if (prev) wipeEntry(prev);
    // Copy the bytes so the caller's Uint8Array lifetime is independent.
    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    store.set(key, {
      bytes: copy,
      expiresAtMs: (clock.now() as number) + opts.ttlMs,
    });
  }

  async function get(key: string): Promise<SecureMemory | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if ((clock.now() as number) >= entry.expiresAtMs) {
      wipeEntry(entry);
      store.delete(key);
      return null;
    }
    return createSecureMemory(entry.bytes);
  }

  async function del(key: string): Promise<void> {
    const entry = store.get(key);
    if (!entry) return;
    wipeEntry(entry);
    store.delete(key);
  }

  async function clear(): Promise<void> {
    for (const entry of store.values()) wipeEntry(entry);
    store.clear();
  }

  return { put, get, delete: del, clear };
}

/* ------------------------------------------------------------------------- */
/* Encrypted-on-disk placeholder                                             */
/* ------------------------------------------------------------------------- */

/**
 * Encrypted-on-disk SafeStorage. NOT implemented in Phase 1.
 *
 * Any future implementation MUST:
 *   - derive its encryption key from a user passphrase (Argon2id) or
 *     host-keystore-bound material;
 *   - never write plaintext, even in temp files / swap-prone buffers;
 *   - accept audit approval before merging.
 *
 * Throws to ensure accidental use fails loudly.
 */
export function createEncryptedSafeStorage(): SafeStorage {
  throw new Error(
    '[security] Encrypted SafeStorage has no implementation yet. ' +
      'Audit approval is required per MASTER_SYSTEM 2.2 and 2.8.',
  );
}
