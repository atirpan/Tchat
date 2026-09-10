/**
 * DerivationService
 *
 * Responsibilities:
 *   - Derive a `RootIdentity` from a `Seed`.
 *   - Derive a per-relationship `DerivedIdentity` from a `RootIdentity` plus
 *     an `IdentityContext`.
 *
 * Anonymity contract (enforced by HKDF domain separation):
 *   - The root PRK never leaves its SecureMemory handle.
 *   - Two derived identities from the same root, under different contexts,
 *     are cryptographically unlinkable.
 *   - Advertised fingerprints are HKDF outputs (not raw public keys of a
 *     signature scheme — those arrive in Phase 2) and contain no metadata.
 *
 * Out of scope (Phase 2 / 3):
 *   - Actual asymmetric key pairs (Ed25519 / X25519) derived from the PRK.
 *   - Signature / AEAD primitives bound to derived identities.
 *   - Rotation scheduler. The `epoch` field in `IdentityContext` is the
 *     rotation knob; scheduling happens in AnonymityModule later.
 *
 * MASTER_SYSTEM references: 2.1, 2.5, 5, 6, 12.
 */
import {
  createSecureMemory,
  hkdfExpand,
  hkdfExtract,
  type SecureMemory,
  zeroize,
} from '@anonym-messenger/security';
import type {
  DerivedIdentity,
  IdentityContext,
  IdentityFingerprint,
  RootIdentity,
  SecureMemoryLike,
} from '@anonym-messenger/types';
import { asOpaqueId } from '@anonym-messenger/types';
import { Injectable } from '@nestjs/common';

import {
  DERIVED_INFO_PREFIX,
  FINGERPRINT_BYTES,
  FINGERPRINT_INFO,
  PRK_LENGTH,
  ROOT_INFO,
  ROOT_SALT,
} from './constants';

@Injectable()
export class DerivationService {
  /**
   * Derive the root identity. `seed` is consumed only via `withBytes`; the
   * caller retains ownership and SHOULD zero it after this call when the
   * seed is no longer needed in the session.
   */
  deriveRoot(seed: SecureMemory): RootIdentity {
    const masterSm = seed.withBytes((seedBytes) => {
      const prk = hkdfExtract(ROOT_SALT, seedBytes);
      try {
        const master = hkdfExpand(prk, ROOT_INFO, PRK_LENGTH);
        try {
          return createSecureMemory(master);
        } finally {
          zeroize(master);
        }
      } finally {
        zeroize(prk);
      }
    });
    return makeRoot(masterSm);
  }

  /**
   * Derive a per-relationship identity. Same (root, context) always returns
   * an identity whose fingerprint matches byte-for-byte — i.e. derivation
   * is deterministic, so the same peer pair keeps talking to the same
   * identity without any server-side lookup.
   *
   * Different contexts produce cryptographically unlinkable outputs.
   */
  deriveForContext(root: RootIdentity, context: IdentityContext): DerivedIdentity {
    if (!Number.isInteger(context.epoch) || context.epoch < 0) {
      throw new RangeError(`DerivationService: epoch must be a non-negative integer.`);
    }
    const info = encodeDerivedInfo(context);
    const material = root.master.withBytes((masterBytes) => {
      return hkdfExpand(masterBytes, info, PRK_LENGTH);
    });
    try {
      const fingerprintBytes = hkdfExpand(material, FINGERPRINT_INFO, FINGERPRINT_BYTES);
      try {
        const privateMaterial = createSecureMemory(material);
        const fingerprint = asOpaqueId<'identity-fingerprint'>(
          Buffer.from(fingerprintBytes).toString('base64url'),
          'identity-fingerprint',
        );
        return makeDerived(fingerprint, privateMaterial, context);
      } finally {
        zeroize(fingerprintBytes);
      }
    } finally {
      zeroize(material);
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Internal helpers                                                          */
/* ------------------------------------------------------------------------- */

function encodeDerivedInfo(context: IdentityContext): Uint8Array {
  const label = new TextEncoder().encode(context.label as unknown as string);
  const epoch = new Uint8Array(4);
  // big-endian epoch
  epoch[0] = (context.epoch >>> 24) & 0xff;
  epoch[1] = (context.epoch >>> 16) & 0xff;
  epoch[2] = (context.epoch >>> 8) & 0xff;
  epoch[3] = context.epoch & 0xff;
  const info = new Uint8Array(DERIVED_INFO_PREFIX.byteLength + label.byteLength + 4);
  info.set(DERIVED_INFO_PREFIX, 0);
  info.set(label, DERIVED_INFO_PREFIX.byteLength);
  info.set(epoch, DERIVED_INFO_PREFIX.byteLength + label.byteLength);
  return info;
}

function makeRoot(master: SecureMemory): RootIdentity {
  const materialLike: SecureMemoryLike = master;
  return {
    master: materialLike,
    destroy() {
      master.zero();
    },
  };
}

function makeDerived(
  fingerprint: IdentityFingerprint,
  privateMaterial: SecureMemory,
  context: IdentityContext,
): DerivedIdentity {
  const privateLike: SecureMemoryLike = privateMaterial;
  return {
    fingerprint,
    privateMaterial: privateLike,
    context,
    destroy() {
      privateMaterial.zero();
    },
  };
}
