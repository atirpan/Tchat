/**
 * MessageOpenService
 *
 * Verifies and decrypts an outer envelope. Applies:
 *   - Protocol version check
 *   - Envelope shape / length sanity
 *   - Replay guard (per session + per counter)
 *   - AEAD authentication
 *   - `sentAt` skew and age sanity (against Clock)
 *
 * Returns an `Ephemeral<MessageInnerEnvelope>` whose `body` is also
 * `Ephemeral`. Callers MUST drop the reference after use.
 *
 * MASTER_SYSTEM references: 2.2, 2.3, 2.5, 5, 11.
 */
import { AeadError, aeadOpen } from '@anonym-messenger/security';
import type {
  Ephemeral,
  MessageInnerEnvelope,
  MessageOuterEnvelope,
} from '@anonym-messenger/types';
import { MESSAGE_PROTOCOL_VERSION, asEphemeral, asTimestamp } from '@anonym-messenger/types';
import type { Clock } from '@anonym-messenger/utils';
import { Inject, Injectable } from '@nestjs/common';

import { MAX_COUNTER } from './constants';
import { MessageDerivationService } from './message-derivation.service';
import { encodeAad } from './message-seal.service';
import {
  AEAD_NONCE_BYTES_EXPECTED,
  MAX_FUTURE_SKEW_MS,
  MAX_MESSAGE_AGE_MS,
} from './open-constants';
import { ReplayGuardService } from './replay-guard.service';
import { SessionStoreService } from './session-store.service';
import { CLOCK_TOKEN } from './tokens';

export class InvalidEnvelopeError extends Error {
  constructor(reason: string) {
    super(`Invalid envelope: ${reason}`);
    this.name = 'InvalidEnvelopeError';
  }
}

export class SanityError extends Error {
  constructor(reason: string) {
    super(`Sanity guard: ${reason}`);
    this.name = 'SanityError';
  }
}

@Injectable()
export class MessageOpenService {
  constructor(
    private readonly store: SessionStoreService,
    private readonly derivation: MessageDerivationService,
    private readonly replay: ReplayGuardService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  open(envelope: MessageOuterEnvelope): Ephemeral<MessageInnerEnvelope> {
    this.#sanityCheckEnvelope(envelope);
    const slot = this.store.require(envelope.sessionId);

    // Read-only preflight: unauthenticated packets cannot consume a counter.
    this.replay.check(envelope.sessionId, envelope.counter);

    // Derive material deterministically from the recv chain key.
    const material = this.derivation.deriveMessageMaterial(
      slot.recvChainKey,
      envelope.counter,
      slot.nonceSalt,
    );

    const aad = encodeAad(envelope.sessionId, envelope.counter);

    let plaintext: Uint8Array;
    try {
      if (!material.nonce.every((byte, index) => byte === envelope.nonce[index])) {
        throw new InvalidEnvelopeError('nonce does not match derived nonce');
      }
      plaintext = material.key.withBytes((keyBytes) =>
        aeadOpen({
          key: keyBytes,
          nonce: envelope.nonce,
          sealed: envelope.ciphertext,
          aad,
        }),
      );
    } catch (err) {
      if (err instanceof AeadError) {
        throw new InvalidEnvelopeError('authentication failed');
      }
      throw err;
    } finally {
      material.key.zero();
      material.nonce.fill(0);
    }

    // Authentication is the transaction boundary. Authenticated malformed inner
    // payloads consume a chain step, but forged packets never mutate state.
    let inner: { v: number; sentAt: number; contentType: string; body: Uint8Array };
    try {
      const nextChain = this.derivation.ratchetChain(slot.recvChainKey);
      try {
        this.store.replaceRecvChainKey(envelope.sessionId, nextChain);
      } catch (err) {
        nextChain.zero();
        throw err;
      }
      this.replay.accept(envelope.sessionId, envelope.counter);
      inner = decodeInner(plaintext);
    } finally {
      plaintext.fill(0);
    }

    try {
      if (inner.v !== MESSAGE_PROTOCOL_VERSION) {
        throw new InvalidEnvelopeError('unsupported inner version');
      }
      this.#sanityCheckSentAt(inner.sentAt);
    } catch (err) {
      inner.body.fill(0);
      throw err;
    }

    const envelopeOut: MessageInnerEnvelope = {
      v: MESSAGE_PROTOCOL_VERSION,
      sentAt: asTimestamp(inner.sentAt),
      contentType: inner.contentType,
      body: asEphemeral(inner.body),
    };
    return asEphemeral(envelopeOut);
  }

  #sanityCheckEnvelope(e: MessageOuterEnvelope): void {
    if (!e || typeof e !== 'object') throw new InvalidEnvelopeError('bad envelope');
    if (typeof e.sessionId !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(e.sessionId)) {
      throw new InvalidEnvelopeError('bad session id');
    }
    if (e.v !== MESSAGE_PROTOCOL_VERSION) {
      throw new InvalidEnvelopeError('unsupported outer version');
    }
    if (!(e.nonce instanceof Uint8Array) || e.nonce.byteLength !== AEAD_NONCE_BYTES_EXPECTED) {
      throw new InvalidEnvelopeError('bad nonce length');
    }
    if (!(e.ciphertext instanceof Uint8Array) || e.ciphertext.byteLength < 17) {
      throw new InvalidEnvelopeError('ciphertext too short');
    }
    if (e.ciphertext.byteLength > 1024 * 1024)
      throw new InvalidEnvelopeError('ciphertext too large');
    if (!Number.isSafeInteger(e.counter) || e.counter >= MAX_COUNTER)
      throw new InvalidEnvelopeError('counter exceeds limit');
    if (!Number.isInteger(e.counter as unknown as number) || (e.counter as unknown as number) < 0) {
      throw new InvalidEnvelopeError('bad counter');
    }
  }

  #sanityCheckSentAt(sentAt: number): void {
    if (!Number.isSafeInteger(sentAt) || sentAt < 0) throw new SanityError('invalid sentAt');
    const now = this.clock.now() as unknown as number;
    if (sentAt > now + MAX_FUTURE_SKEW_MS) {
      throw new SanityError('sentAt too far in future');
    }
    if (sentAt < now - MAX_MESSAGE_AGE_MS) {
      throw new SanityError('message too old');
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Inner decode                                                              */
/* ------------------------------------------------------------------------- */

function decodeInner(buf: Uint8Array): {
  v: number;
  sentAt: number;
  contentType: string;
  body: Uint8Array;
} {
  if (buf.byteLength < 1 + 8 + 1 + 4) throw new InvalidEnvelopeError('inner too short');
  let p = 0;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const v = view.getUint8(p++);
  const sentAt = readBe64(buf, p);
  p += 8;
  const ctLen = view.getUint8(p++);
  if (p + ctLen + 4 > buf.byteLength) throw new InvalidEnvelopeError('inner truncated');
  const contentType = new TextDecoder().decode(buf.subarray(p, p + ctLen));
  p += ctLen;
  const bodyLen = readBe32(buf, p);
  p += 4;
  if (p + bodyLen !== buf.byteLength) throw new InvalidEnvelopeError('inner length mismatch');
  // Copy body into a fresh buffer so the decoded Ephemeral outlives the
  // transient `plaintext` which will be zeroized by the caller.
  const body = new Uint8Array(bodyLen);
  body.set(buf.subarray(p, p + bodyLen));
  return { v, sentAt, contentType, body };
}

function readBe32(buf: Uint8Array, offset: number): number {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(offset, false);
}

function readBe64(buf: Uint8Array, offset: number): number {
  const hi = readBe32(buf, offset);
  const lo = readBe32(buf, offset + 4);
  return hi * 0x1_0000_0000 + lo;
}
