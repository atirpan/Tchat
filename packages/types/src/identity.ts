/**
 * Identity types (Phase 1).
 *
 * MASTER_SYSTEM references: 2.1 (no personal identity), 3.2 (module
 * isolation), 6 (unlinkability), 12 (no global identity).
 *
 * Invariants enforced here at the type level:
 *
 *   - `Seed` is `Ephemeral<Uint8Array>`: the type system records that it
 *     MUST NOT be persisted, serialized, logged, or forwarded beyond the
 *     scope that received it.
 *
 *   - `RootIdentity` / `DerivedIdentity` hold SECRET key material ONLY
 *     inside a `SecureMemory` handle. Their public surface is an opaque
 *     fingerprint ID; raw bytes never leak from the struct shape.
 *
 *   - Identifiers are `OpaqueId<Kind>` branded strings. `OpaqueId<'user'>`
 *     does NOT and MUST NOT exist.
 */

import type { Ephemeral, OpaqueId } from './index';

/* ------------------------------------------------------------------------- */
/* Seed                                                                      */
/* ------------------------------------------------------------------------- */

/**
 * 32-byte high-entropy secret. Root of the entire key derivation tree.
 *
 * Ephemeral by type. Callers MUST zero the view as soon as they stop
 * needing it; `SecureMemory.withBytes` is the preferred access pattern.
 */
export type Seed = Ephemeral<Uint8Array>;

/** The on-disk / on-screen recovery form of a seed. Treated as a secret. */
export type RecoveryString = Ephemeral<string>;

/* ------------------------------------------------------------------------- */
/* Fingerprints                                                              */
/* ------------------------------------------------------------------------- */

/**
 * The public, advertised identifier of a derived identity. Derived from the
 * derived public key, NOT from the seed. Two fingerprints belonging to the
 * same seed but different relationships MUST be cryptographically
 * unlinkable.
 *
 * Root identity has no fingerprint because the root NEVER appears on the
 * network.
 */
export type IdentityFingerprint = OpaqueId<'identity-fingerprint'>;

/* ------------------------------------------------------------------------- */
/* Context                                                                   */
/* ------------------------------------------------------------------------- */

/**
 * Derivation context — the namespace under which a per-relationship
 * identity is produced. The `label` is itself opaque: upstream (messaging /
 * invite) decides what a "relationship" is and produces the label bytes.
 *
 * The context MUST NOT contain personal data. It is hashed into the
 * derivation chain, so anything here becomes permanently bound to the
 * derived identity.
 */
export interface IdentityContext {
  /** Opaque bytes that name the relationship. High entropy expected. */
  readonly label: OpaqueId<'derivation-label'>;

  /**
   * Monotonic rotation counter. Increment to rotate the derived identity
   * without changing the relationship label (MASTER_SYSTEM 6: identity
   * rotation). Default 0.
   */
  readonly epoch: number;
}

/* ------------------------------------------------------------------------- */
/* Root and Derived Identities                                               */
/* ------------------------------------------------------------------------- */

/**
 * Root identity. Never appears on the network. Holds the master PRK in a
 * `SecureMemory` handle. Produces derived identities on demand.
 *
 * Consumers of Identity MUST NOT keep a direct reference to the root. They
 * should ask the IdentityService for a `DerivedIdentity` and use that.
 */
export interface RootIdentity {
  /** Opaque handle to root's pseudorandom key. */
  readonly master: SecureMemoryLike;

  /** Destroys the root. Zeroes the underlying bytes. */
  destroy(): void;
}

/**
 * Derived identity. One per relationship. Linkability to the root and to
 * other derived identities of the same root is cryptographically negligible.
 */
export interface DerivedIdentity {
  /** Public fingerprint, safe to show to the counterparty. */
  readonly fingerprint: IdentityFingerprint;

  /** Opaque handle to the derived private material. */
  readonly privateMaterial: SecureMemoryLike;

  /** Context under which this identity was derived (for rotation / audit). */
  readonly context: IdentityContext;

  /** Destroys the derived identity. Zeroes the underlying bytes. */
  destroy(): void;
}

/* ------------------------------------------------------------------------- */
/* SecureMemoryLike                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Minimal structural shape of `SecureMemory` exposed through the types
 * package, so consumers can depend on types without importing the security
 * package. The canonical interface lives in `@anonym-messenger/security`.
 */
export interface SecureMemoryLike {
  readonly length: number;
  readonly destroyed: boolean;
  withBytes<T>(fn: (view: Uint8Array) => T): T;
  zero(): void;
}
