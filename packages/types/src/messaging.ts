/**
 * Messaging types (Phase 2).
 *
 * MASTER_SYSTEM references: 2.1 (no personal identity), 2.2 (ephemeral by
 * default), 2.3 (no tracking), 3.2 (module isolation), 6 (unlinkability),
 * 12 (no persistent chat history, no read receipts / typing / last seen).
 *
 * Invariants enforced here at the type level:
 *
 *   - The OUTER envelope contains NO identity and NO peer-correlatable
 *     field. `sessionId` is an HKDF-derived opaque id, scoped to a single
 *     session, unlinkable across sessions or peers.
 *
 *   - The INNER envelope is always encrypted. When decrypted, its `body`
 *     is `Ephemeral<Uint8Array>`, forcing callers to drop it after use.
 *
 *   - No `sender`, `recipient`, `conversationId`, `roomId`, or `peerId`
 *     fields exist. Those patterns are forbidden by MASTER_SYSTEM §12.
 */

import type { Ephemeral, OpaqueId, Timestamp } from './index';

/** Protocol version for messaging envelopes. */
export const MESSAGE_PROTOCOL_VERSION = 1 as const;
export type MessageProtocolVersion = typeof MESSAGE_PROTOCOL_VERSION;

/* ------------------------------------------------------------------------- */
/* Brands                                                                    */
/* ------------------------------------------------------------------------- */

/** Opaque session identifier. Derived via HKDF; contains no identity. */
export type MessageSessionId = OpaqueId<'message-session'>;

declare const __messageCounterBrand: unique symbol;
/**
 * Strictly-monotonic per-direction counter. Wraps at 2^32 - 1 — that is
 * forbidden long before we reach it (sessions are short-lived).
 */
export type MessageCounter = number & {
  readonly [__messageCounterBrand]: 'MessageCounter';
};

export function asMessageCounter(n: number): MessageCounter {
  return n as MessageCounter;
}

/**
 * Side of the session (established by the out-of-scope handshake). Phase 2
 * does NOT establish it; the caller tells each peer which side they are on.
 */
export type SessionRole = 'initiator' | 'responder';

/* ------------------------------------------------------------------------- */
/* Envelopes                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * Outer envelope. Deliberately minimal — this is the ONLY part of a message
 * that a transport layer (Phase 4) will observe in cleartext.
 *
 * Forbidden fields (checked by review and by type shape — they are not
 * declared here): sender fingerprint, recipient fingerprint, peer id,
 * conversation id, room id, plaintext body, online status, read-receipt
 * flag, typing flag, timestamp (sentAt lives in the inner envelope on
 * purpose — it MUST be hidden from passive observers).
 */
export interface MessageOuterEnvelope {
  /** Envelope schema version. Bumped per wire-format change. */
  readonly v: MessageProtocolVersion;

  /** Opaque session id (HKDF-derived, 16 bytes → base64url). */
  readonly sessionId: MessageSessionId;

  /**
   * Strictly-monotonic per-direction counter. Required outer because the
   * receiver must derive `msgKey_n` before it can decrypt.
   */
  readonly counter: MessageCounter;

  /** 12-byte AEAD nonce (HKDF-derived from chain key + counter). */
  readonly nonce: Uint8Array;

  /** `ChaCha20-Poly1305(plaintext)` with the 16-byte auth tag appended. */
  readonly ciphertext: Uint8Array;
}

/**
 * Inner envelope. Always encrypted when in transit or at rest (at rest is
 * forbidden by default — Phase 2 keeps no history; this shape is what the
 * receiver SEES after a successful `open`).
 *
 * `body` is `Ephemeral<Uint8Array>`: the type system records that it MUST
 * be consumed and dropped.
 */
export interface MessageInnerEnvelope {
  readonly v: MessageProtocolVersion;

  /** Client-declared send timestamp. Validated against Clock on open. */
  readonly sentAt: Timestamp;

  /**
   * MIME-like content type. Kept in the inner envelope so transports see
   * nothing about what is being sent. Whitelisted at the application layer.
   */
  readonly contentType: string;

  /** Decrypted, opaque payload. Ephemeral by type. */
  readonly body: Ephemeral<Uint8Array>;
}

/* ------------------------------------------------------------------------- */
/* Session lifecycle                                                         */
/* ------------------------------------------------------------------------- */

export interface MessageSessionDescriptor {
  /** Opaque session id. */
  readonly sessionId: MessageSessionId;

  /** Which side of the session this peer is on. */
  readonly role: SessionRole;

  /**
   * Milliseconds-since-epoch after which the session MUST be destroyed.
   * Not exposed on the wire; this is a local lifecycle bound.
   */
  readonly expiresAtMs: number;
}
