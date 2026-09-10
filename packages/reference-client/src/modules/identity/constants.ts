/**
 * Identity module constants.
 *
 * Domain-separation tags for HKDF. Every tag begins with a versioned prefix
 * so future changes never collide with old material. Never remove a tag;
 * rename with a new version suffix if the derivation semantics change.
 *
 * MASTER_SYSTEM references: 2.5, 6.
 */

/** Salt used for the root extract step. */
export const ROOT_SALT = new TextEncoder().encode('am/identity/v1/root-salt');

/** Info label for the root master PRK (output of HKDF-Extract then Expand). */
export const ROOT_INFO = new TextEncoder().encode('am/identity/v1/root-master');

/**
 * Info prefix for per-relationship derivation. Concatenated with the
 * relationship label bytes and a big-endian 4-byte epoch.
 */
export const DERIVED_INFO_PREFIX = new TextEncoder().encode('am/identity/v1/derived|');

/** Info label for producing the public fingerprint from the derived PRK. */
export const FINGERPRINT_INFO = new TextEncoder().encode('am/identity/v1/fingerprint');

/** Byte length of the master / derived PRK. */
export const PRK_LENGTH = 64;

/** Byte length of the public fingerprint, pre-encoding. */
export const FINGERPRINT_BYTES = 16;

/** Byte length of the random seed. */
export const SEED_LENGTH = 32;

/** Byte length of the recovery-string checksum. */
export const RECOVERY_CHECKSUM_BYTES = 4;

/**
 * Default TTL for seed material held in RAM SafeStorage during an active
 * session. 24 hours. Callers can override per-call.
 */
export const DEFAULT_SEED_TTL_MS = 24 * 60 * 60 * 1000;

/** Storage key namespace for identity material. */
export const STORAGE_KEY_SEED = 'identity:seed:v1';
