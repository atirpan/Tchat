/**
 * SecureMemory
 *
 * Short-lived sensitive byte buffer with a clear zeroize contract.
 *
 * Phase 1 ships a REAL in-process implementation. Device-level protections
 * (screenshot block, fake UI mode, OS-level mlock equivalents) remain
 * Phase 3.
 *
 * MASTER_SYSTEM references: 2.5, 5, 11.
 *
 * Implementation notes:
 *   - The backing buffer is an owned `Uint8Array`. Callers cannot hold a
 *     reference to it after `withBytes` returns; the view becomes a
 *     detached alias of already-zeroed memory.
 *   - `zero()` is idempotent.
 *   - The object is NOT serializable: `toJSON` and `toString` redact.
 */

export interface SecureMemory {
  readonly length: number;
  readonly destroyed: boolean;
  withBytes<T>(fn: (view: Uint8Array) => T): T;
  zero(): void;
}

export type SecureMemoryFactory = (bytes: Uint8Array) => SecureMemory;

class SecureMemoryImpl implements SecureMemory {
  #buffer: Uint8Array | null;
  readonly #length: number;

  constructor(bytes: Uint8Array) {
    // Copy into an owned buffer. Callers passing an external Uint8Array
    // should NOT retain it; they should zero it themselves after.
    this.#buffer = new Uint8Array(bytes.byteLength);
    this.#buffer.set(bytes);
    this.#length = bytes.byteLength;
  }

  get length(): number {
    return this.#length;
  }

  get destroyed(): boolean {
    return this.#buffer === null;
  }

  withBytes<T>(fn: (view: Uint8Array) => T): T {
    if (this.#buffer === null) {
      throw new Error('SecureMemory: cannot access bytes after zero()');
    }
    // Synchronous borrowed copy. Retaining this view does not retain the owner.
    // JavaScript copies made by the caller cannot be reliably erased here.
    const view = new Uint8Array(this.#buffer);
    try {
      return fn(view);
    } finally {
      view.fill(0);
    }
  }

  zero(): void {
    if (this.#buffer === null) return;
    this.#buffer.fill(0);
    this.#buffer = null;
  }

  /** Block accidental serialization. */
  toJSON(): string {
    return '[SecureMemory]';
  }

  /** Block accidental string coercion. */
  toString(): string {
    return '[SecureMemory]';
  }
}

/** Real factory. Copies bytes in. Caller should zero its own input after. */
export const createSecureMemory: SecureMemoryFactory = (bytes) => {
  return new SecureMemoryImpl(bytes);
};
