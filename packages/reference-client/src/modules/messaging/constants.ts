/**
 * Messaging constants.
 *
 * Domain-separated, versioned HKDF tags. Immutable under audit. Every tag
 * begins with "am/messaging/v1/" so Phase 2 material can never be confused
 * with Phase 1 identity material, and a future v2 protocol cannot collide
 * with v1.
 *
 * MASTER_SYSTEM references: 2.5, 6.
 */

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/**
 * HKDF-Extract salt prefix. The per-session random `sessionSalt` (16 bytes,
 * NEVER on the wire) is concatenated after this prefix and used as the
 * full HKDF-Extract salt. This is the anti-determinism hardening: same
 * `sharedSecret` + different `sessionSalt` → indistinguishable session
 * material.
 */
export const SESSION_SALT_PREFIX = enc('am/messaging/v1/session-salt|');

/** Info labels for chain keys. */
export const CHAIN_INFO_INITIATOR = enc('am/messaging/v1/chain|initiator');
export const CHAIN_INFO_RESPONDER = enc('am/messaging/v1/chain|responder');

/** Info label for the outer session-id. */
export const SESSION_ID_INFO = enc('am/messaging/v1/session-id');

/** Info labels for per-message material, concatenated with BE32(counter). */
export const MSG_KEY_INFO_PREFIX = enc('am/messaging/v1/msg-key|');
export const MSG_NONCE_INFO_PREFIX = enc('am/messaging/v1/msg-nonce|');

/** Info label for the chain-key ratchet step. */
export const CHAIN_RATCHET_INFO = enc('am/messaging/v1/chain-ratchet');

/** Info labels for the per-direction random counter start offsets. */
export const COUNTER_START_INFO_INITIATOR = enc('am/messaging/v1/counter-start|initiator');
export const COUNTER_START_INFO_RESPONDER = enc('am/messaging/v1/counter-start|responder');

/** Info label for the session-scoped nonce salt (extra nonce entropy). */
export const NONCE_SALT_INFO = enc('am/messaging/v1/nonce-salt');

/* Byte lengths */
export const CHAIN_KEY_BYTES = 32;
export const MSG_KEY_BYTES = 32;
export const MSG_NONCE_BYTES = 12;
export const SESSION_ID_BYTES = 16;
export const SESSION_SALT_BYTES = 16;
export const NONCE_SALT_BYTES = 8;

/**
 * Counter start offset bit-width. 24 bits → offsets in [0, 2^24), leaving
 * a ~127-message headroom below MAX_COUNTER per session.
 */
export const COUNTER_START_MASK = 0x00ff_ffff;

/**
 * Default session lifetime. Jittered per session (see TTL_JITTER_RATIO)
 * so that session expirations do not form a uniform timing pattern.
 */
export const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000;

/**
 * Default TTL jitter ratio. Actual expiration is
 * `expiresAtMs = now + ttlMs + uniform(-ttlMs*ratio, +ttlMs*ratio)`.
 */
export const TTL_JITTER_RATIO = 0.1;

/**
 * Maximum accepted clock skew between peers when validating `sentAt`.
 */
export const MAX_FUTURE_SKEW_MS = 60 * 1000;

/** Maximum age of a message, measured against local Clock. */
export const MAX_MESSAGE_AGE_MS = 24 * 60 * 60 * 1000;

/** Replay-guard window size in messages. */
export const REPLAY_WINDOW = 64;

/**
 * Upper bound on counter value. Sessions approaching this MUST be torn
 * down and replaced — handled by the future rotation scheduler.
 */
export const MAX_COUNTER = 2 ** 31 - 1;
