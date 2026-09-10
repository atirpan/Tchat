/**
 * @anonym-messenger/security
 *
 * Phase 2 surface:
 *   - SecureMemory (real RAM-zeroing implementation)
 *   - SafeStorage (RAM-only concrete; encrypted-on-disk placeholder)
 *   - Redaction helpers
 *   - Low-level crypto primitives (SHA, HMAC, HKDF-SHA512, CSPRNG,
 *     constant-time compare, zeroize)
 *   - AEAD: ChaCha20-Poly1305 (seal / open)
 *
 * Higher-level protocols (Double Ratchet, PQ hybrids) remain deferred.
 *
 * No plaintext sensitive data may ever be stored, logged, or returned from
 * this package (MASTER_SYSTEM 2.5, 11).
 */
export * from './secure-memory';
export * from './safe-storage';
export * from './redaction';
export * from './crypto';
export * from './hkdf';
export * from './aead';
