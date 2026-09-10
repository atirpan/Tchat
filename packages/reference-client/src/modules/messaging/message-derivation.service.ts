/**
 * MessageDerivationService
 *
 * Phase 2 hardening update. Introduces:
 *   - per-session random `sessionSalt` (16 bytes) mixed into HKDF-Extract,
 *     defeating session-id determinism;
 *   - per-session random `nonceSalt` (8 bytes) mixed into every
 *     per-message nonce derivation;
 *   - per-direction random `counterStart` offsets (24-bit), so counters
 *     never begin at 0.
 *
 * Derivation scheme v1 (hardened):
 *
 *   extractSalt   = SESSION_SALT_PREFIX || sessionSalt (16B random, off-wire)
 *   PRK           = HKDF-Extract(extractSalt, sharedSecret)
 *   chain_*       = HKDF-Expand(PRK, "chain|<role>", 32)
 *   sessionId     = HKDF-Expand(PRK, "session-id", 16)
 *   nonceSalt     = HKDF-Expand(PRK, "nonce-salt", 8)
 *   counterStart_*= HKDF-Expand(PRK, "counter-start|<role>", 4) & 0x00ffffff
 *
 *   msgKey_n      = HKDF-Expand(chainKey_n, "msg-key|"   || BE32(counter), 32)
 *   nonce_n       = HKDF-Expand(chainKey_n, "msg-nonce|" || nonceSalt || BE32(counter), 12)
 *   chainKey_{n+1}= HKDF-Expand(chainKey_n, "chain-ratchet", 32)
 *
 * MASTER_SYSTEM references: 2.5, 5, 6.
 */
import {
  createSecureMemory,
  hkdfExpand,
  hkdfExtract,
  randomBytes,
  type SecureMemory,
  zeroize,
} from '@anonym-messenger/security';
import type { MessageCounter, MessageSessionId, SessionRole } from '@anonym-messenger/types';
import { asOpaqueId } from '@anonym-messenger/types';
import { Injectable } from '@nestjs/common';

import {
  CHAIN_INFO_INITIATOR,
  CHAIN_INFO_RESPONDER,
  CHAIN_KEY_BYTES,
  CHAIN_RATCHET_INFO,
  COUNTER_START_INFO_INITIATOR,
  COUNTER_START_INFO_RESPONDER,
  COUNTER_START_MASK,
  MSG_KEY_BYTES,
  MSG_KEY_INFO_PREFIX,
  MSG_NONCE_BYTES,
  MSG_NONCE_INFO_PREFIX,
  NONCE_SALT_BYTES,
  NONCE_SALT_INFO,
  SESSION_ID_BYTES,
  SESSION_ID_INFO,
  SESSION_SALT_BYTES,
  SESSION_SALT_PREFIX,
} from './constants';

export class InvalidSessionSaltError extends Error {
  constructor(reason: string) {
    super(`Invalid sessionSalt: ${reason}`);
    this.name = 'InvalidSessionSaltError';
  }
}

export interface DerivedSessionMaterial {
  sessionId: MessageSessionId;
  sendChainKey: SecureMemory;
  recvChainKey: SecureMemory;
  /** 8-byte opaque salt mixed into every nonce. Kept in SessionSlot. */
  nonceSalt: Uint8Array;
  /** First counter this direction will send. */
  sendStartOffset: number;
  /** First acceptable counter this direction will receive. */
  recvStartOffset: number;
}

export interface PerMessageMaterial {
  key: SecureMemory;
  nonce: Uint8Array;
}

@Injectable()
export class MessageDerivationService {
  /**
   * Generate a fresh `sessionSalt`. The initiator calls this once at
   * handshake time and transports the salt to the responder via the
   * (Phase 3) out-of-band handshake. It is NEVER placed in the outer
   * envelope. 16 bytes of CSPRNG entropy.
   */
  generateSessionSalt(): Uint8Array {
    return randomBytes(SESSION_SALT_BYTES);
  }

  deriveSession(
    sharedSecret: SecureMemory,
    role: SessionRole,
    sessionSalt: Uint8Array,
  ): DerivedSessionMaterial {
    if (!(sessionSalt instanceof Uint8Array) || sessionSalt.byteLength !== SESSION_SALT_BYTES) {
      throw new InvalidSessionSaltError(`expected ${SESSION_SALT_BYTES} bytes`);
    }

    const extractSalt = concat(SESSION_SALT_PREFIX, sessionSalt);

    return sharedSecret.withBytes((secretBytes) => {
      const prk = hkdfExtract(extractSalt, secretBytes);
      try {
        const chainInitiator = hkdfExpand(prk, CHAIN_INFO_INITIATOR, CHAIN_KEY_BYTES);
        const chainResponder = hkdfExpand(prk, CHAIN_INFO_RESPONDER, CHAIN_KEY_BYTES);
        const sessionIdBytes = hkdfExpand(prk, SESSION_ID_INFO, SESSION_ID_BYTES);
        const nonceSalt = hkdfExpand(prk, NONCE_SALT_INFO, NONCE_SALT_BYTES);
        const startInitiatorBytes = hkdfExpand(prk, COUNTER_START_INFO_INITIATOR, 4);
        const startResponderBytes = hkdfExpand(prk, COUNTER_START_INFO_RESPONDER, 4);
        try {
          const startInitiator = readBe32(startInitiatorBytes) & COUNTER_START_MASK;
          const startResponder = readBe32(startResponderBytes) & COUNTER_START_MASK;

          const send = role === 'initiator' ? chainInitiator : chainResponder;
          const recv = role === 'initiator' ? chainResponder : chainInitiator;
          const sendStartOffset = role === 'initiator' ? startInitiator : startResponder;
          const recvStartOffset = role === 'initiator' ? startResponder : startInitiator;

          const sendKey = createSecureMemory(send);
          const recvKey = createSecureMemory(recv);
          const sessionId = asOpaqueId<'message-session'>(
            Buffer.from(sessionIdBytes).toString('base64url'),
            'message-session',
          );
          return {
            sessionId,
            sendChainKey: sendKey,
            recvChainKey: recvKey,
            nonceSalt: new Uint8Array(nonceSalt), // fresh copy; we zero the original next
            sendStartOffset,
            recvStartOffset,
          };
        } finally {
          zeroize(chainInitiator);
          zeroize(chainResponder);
          zeroize(sessionIdBytes);
          zeroize(nonceSalt);
          zeroize(startInitiatorBytes);
          zeroize(startResponderBytes);
        }
      } finally {
        zeroize(prk);
        zeroize(extractSalt);
      }
    });
  }

  /**
   * Derive per-message key + nonce. The `nonceSalt` is the session-scoped
   * salt produced by `deriveSession`; it MUST be 8 bytes.
   */
  deriveMessageMaterial(
    chainKey: SecureMemory,
    counter: MessageCounter,
    nonceSalt: Uint8Array,
  ): PerMessageMaterial {
    if (nonceSalt.byteLength !== NONCE_SALT_BYTES) {
      throw new RangeError(`nonceSalt must be ${NONCE_SALT_BYTES} bytes`);
    }
    const counterBytes = encodeBe32(counter);
    const keyInfo = concat(MSG_KEY_INFO_PREFIX, counterBytes);
    const nonceInfo = concat3(MSG_NONCE_INFO_PREFIX, nonceSalt, counterBytes);
    return chainKey.withBytes((chainBytes) => {
      const keyBytes = hkdfExpand(chainBytes, keyInfo, MSG_KEY_BYTES);
      const nonce = hkdfExpand(chainBytes, nonceInfo, MSG_NONCE_BYTES);
      try {
        return { key: createSecureMemory(keyBytes), nonce };
      } finally {
        zeroize(keyBytes);
      }
    });
  }

  ratchetChain(chainKey: SecureMemory): SecureMemory {
    return chainKey.withBytes((chainBytes) => {
      const next = hkdfExpand(chainBytes, CHAIN_RATCHET_INFO, CHAIN_KEY_BYTES);
      try {
        return createSecureMemory(next);
      } finally {
        zeroize(next);
      }
    });
  }
}

function encodeBe32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = (n >>> 24) & 0xff;
  b[1] = (n >>> 16) & 0xff;
  b[2] = (n >>> 8) & 0xff;
  b[3] = n & 0xff;
  return b;
}

function readBe32(b: Uint8Array): number {
  return new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0, false);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.byteLength + b.byteLength);
  out.set(a, 0);
  out.set(b, a.byteLength);
  return out;
}

function concat3(a: Uint8Array, b: Uint8Array, c: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.byteLength + b.byteLength + c.byteLength);
  out.set(a, 0);
  out.set(b, a.byteLength);
  out.set(c, a.byteLength + b.byteLength);
  return out;
}
