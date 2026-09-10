/**
 * MessageSealService
 *
 * Phase 2 hardening update: per-message material is derived with the
 * session's `nonceSalt` threaded into the nonce info string, so nonces
 * do not form predictable patterns across sessions even under worst-case
 * (near-impossible) key collisions.
 *
 * MASTER_SYSTEM references: 2.1, 2.2, 2.5, 5, 11.
 */
import { aeadSeal, type SecureMemory } from '@anonym-messenger/security';
import type { MessageOuterEnvelope, MessageSessionId, Timestamp } from '@anonym-messenger/types';
import { MESSAGE_PROTOCOL_VERSION, asMessageCounter } from '@anonym-messenger/types';
import { Injectable } from '@nestjs/common';

import { MAX_COUNTER } from './constants';
import { MessageDerivationService, type PerMessageMaterial } from './message-derivation.service';
import { CounterExhaustedError, SessionStoreService } from './session-store.service';

export interface SealInput {
  sessionId: MessageSessionId;
  sentAt: Timestamp;
  contentType: string;
  body: Uint8Array;
}

@Injectable()
export class MessageSealService {
  constructor(
    private readonly store: SessionStoreService,
    private readonly derivation: MessageDerivationService,
  ) {}

  seal(input: SealInput): MessageOuterEnvelope {
    // Validate caller input before consuming a counter or advancing the chain.
    if (!(input.body instanceof Uint8Array)) throw new RangeError('invalid body');
    if (
      typeof input.contentType !== 'string' ||
      new TextEncoder().encode(input.contentType).byteLength > 255
    ) {
      throw new RangeError('invalid content type');
    }
    if (!Number.isSafeInteger(input.sentAt) || input.sentAt < 0)
      throw new RangeError('invalid sentAt');
    if (
      14 + new TextEncoder().encode(input.contentType).byteLength + input.body.byteLength + 16 >
      1024 * 1024
    ) {
      throw new RangeError('message exceeds reference envelope limit');
    }
    const slot = this.store.require(input.sessionId);
    if (slot.nextSendCounter >= MAX_COUNTER) throw new CounterExhaustedError();
    const counter = asMessageCounter(slot.nextSendCounter);

    const inner = encodeInner({
      v: MESSAGE_PROTOCOL_VERSION,
      sentAt: input.sentAt,
      contentType: input.contentType,
      body: input.body,
    });

    let material: PerMessageMaterial | undefined;
    let nextChain: SecureMemory | undefined;
    try {
      const derived = this.derivation.deriveMessageMaterial(
        slot.sendChainKey,
        counter,
        slot.nonceSalt,
      );
      material = derived;
      const aad = encodeAad(input.sessionId, counter);
      const ciphertext = derived.key.withBytes((keyBytes) =>
        aeadSeal({ key: keyBytes, nonce: derived.nonce, plaintext: inner, aad }),
      );
      nextChain = this.derivation.ratchetChain(slot.sendChainKey);
      const nonce = new Uint8Array(derived.nonce);
      this.store.commitSend(input.sessionId, counter, nextChain);
      nextChain = undefined; // ownership transferred only after successful commit
      return {
        v: MESSAGE_PROTOCOL_VERSION,
        sessionId: input.sessionId,
        counter,
        nonce,
        ciphertext,
      };
    } finally {
      material?.key.zero();
      material?.nonce.fill(0);
      nextChain?.zero();
      inner.fill(0);
    }
  }
}

export function encodeInner(inner: {
  v: number;
  sentAt: number;
  contentType: string;
  body: Uint8Array;
}): Uint8Array {
  const ct = new TextEncoder().encode(inner.contentType);
  const out = new Uint8Array(1 + 8 + 1 + ct.byteLength + 4 + inner.body.byteLength);
  let p = 0;
  out[p++] = inner.v & 0xff;
  writeBe64(out, p, inner.sentAt);
  p += 8;
  if (ct.byteLength > 255) throw new RangeError('contentType too long');
  out[p++] = ct.byteLength;
  out.set(ct, p);
  p += ct.byteLength;
  writeBe32(out, p, inner.body.byteLength);
  p += 4;
  out.set(inner.body, p);
  return out;
}

export function encodeAad(sessionId: string, counter: number): Uint8Array {
  const sid = new TextEncoder().encode(sessionId);
  const out = new Uint8Array(4 + sid.byteLength + 4);
  writeBe32(out, 0, sid.byteLength);
  out.set(sid, 4);
  writeBe32(out, 4 + sid.byteLength, counter);
  return out;
}

function writeBe32(out: Uint8Array, offset: number, n: number): void {
  out[offset] = (n >>> 24) & 0xff;
  out[offset + 1] = (n >>> 16) & 0xff;
  out[offset + 2] = (n >>> 8) & 0xff;
  out[offset + 3] = n & 0xff;
}

function writeBe64(out: Uint8Array, offset: number, n: number): void {
  const hi = Math.floor(n / 0x1_0000_0000);
  const lo = n >>> 0;
  writeBe32(out, offset, hi);
  writeBe32(out, offset + 4, lo);
}
