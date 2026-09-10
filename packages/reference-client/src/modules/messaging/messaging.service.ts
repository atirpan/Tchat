/**
 * MessagingService
 *
 * Phase 2 hardening update. The public API now requires an explicit
 * per-session salt (16 bytes) and applies randomized TTL jitter to avoid
 * uniform session-expiration fingerprints.
 *
 *   - `sessionSalt` is produced by the handshake layer and delivered
 *     out-of-band. It MUST NOT appear on the outer envelope.
 *     `MessagingService.generateSessionSalt()` returns fresh CSPRNG bytes
 *     for the initiator to use.
 *
 *   - `expiresAtMs` is randomized within `ttlMs ± (ttlMs * jitterRatio)`.
 *
 * MASTER_SYSTEM references: 2.1, 2.2, 2.3, 3.2, 5, 6, 12.
 */

import { randomBytes, type SecureMemory } from '@anonym-messenger/security';
import type {
  Ephemeral,
  MessageInnerEnvelope,
  MessageOuterEnvelope,
  MessageSessionDescriptor,
  SessionRole,
} from '@anonym-messenger/types';
import type { Clock } from '@anonym-messenger/utils';
import { Inject, Injectable } from '@nestjs/common';

import { DEFAULT_SESSION_TTL_MS, TTL_JITTER_RATIO } from './constants';
import { MessageDerivationService } from './message-derivation.service';
import { MessageOpenService } from './message-open.service';
import { MessageSealService, type SealInput } from './message-seal.service';
import { ReplayGuardService } from './replay-guard.service';
import { SessionStoreService } from './session-store.service';
import { CLOCK_TOKEN } from './tokens';

export interface OpenSessionOptions {
  /**
   * 16-byte per-session salt. REQUIRED. Mixed into HKDF-Extract so that
   * the same `sharedSecret` does NOT produce the same `sessionId` across
   * sessions. Never placed on the wire; delivered via the out-of-scope
   * handshake.
   */
  sessionSalt: Uint8Array;

  /** Base TTL before jitter, defaults to 1h. */
  ttlMs?: number;

  /**
   * Jitter ratio. Actual expiration will be
   * `openedAt + ttlMs + uniform(-ttlMs*ratio, +ttlMs*ratio)`.
   * Defaults to 10%. Pass 0 for deterministic tests.
   */
  ttlJitterRatio?: number;
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly store: SessionStoreService,
    private readonly derivation: MessageDerivationService,
    private readonly sealer: MessageSealService,
    private readonly opener: MessageOpenService,
    private readonly replay: ReplayGuardService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  /**
   * Produce a fresh 16-byte `sessionSalt` for an initiator. Call once per
   * new session and send to the responder via the handshake layer.
   */
  generateSessionSalt(): Uint8Array {
    return this.derivation.generateSessionSalt();
  }

  openSession(
    sharedSecret: SecureMemory,
    role: SessionRole,
    opts: OpenSessionOptions,
  ): MessageSessionDescriptor {
    const baseTtl = opts.ttlMs ?? DEFAULT_SESSION_TTL_MS;
    if (!Number.isSafeInteger(baseTtl) || baseTtl <= 0 || baseTtl > 24 * 60 * 60 * 1000) {
      throw new RangeError('reference ttlMs must be an integer between 1 ms and 24 hours.');
    }
    const jitterRatio = opts.ttlJitterRatio ?? TTL_JITTER_RATIO;
    if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 0.5) {
      throw new RangeError('ttlJitterRatio must be between 0 and 0.5.');
    }
    if (role !== 'initiator' && role !== 'responder') throw new RangeError('invalid session role');
    const effectiveTtl = applyTtlJitter(baseTtl, jitterRatio);
    const expiresAtMs = (this.clock.now() as number) + effectiveTtl;
    if (!Number.isSafeInteger(expiresAtMs)) throw new RangeError('invalid expiration');
    const material = this.derivation.deriveSession(sharedSecret, role, opts.sessionSalt);

    const descriptor: MessageSessionDescriptor = {
      sessionId: material.sessionId,
      role,
      expiresAtMs,
    };

    this.store.open({
      descriptor,
      sendChainKey: material.sendChainKey,
      recvChainKey: material.recvChainKey,
      nonceSalt: material.nonceSalt,
      sendStartOffset: material.sendStartOffset,
    });

    // Prime replay guard with the peer's random recv start offset so
    // counters below it are rejected before they can reach the AEAD.
    this.replay.init(material.sessionId, material.recvStartOffset);

    return descriptor;
  }

  seal(input: Omit<SealInput, 'sentAt'> & { sentAt?: number }): MessageOuterEnvelope {
    const sentAt = (input.sentAt ?? (this.clock.now() as unknown as number)) as number;
    return this.sealer.seal({ ...input, sentAt: sentAt as never });
  }

  open(envelope: MessageOuterEnvelope): Ephemeral<MessageInnerEnvelope> {
    return this.opener.open(envelope);
  }

  destroySession(descriptor: MessageSessionDescriptor): void {
    this.store.close(descriptor.sessionId);
    this.replay.forget(descriptor.sessionId);
  }

  destroyAll(): void {
    this.store.closeAll();
    this.replay.forgetAll();
  }
}

/**
 * CSPRNG-based TTL jitter. Never yields 0 or negative.
 * Uniform over `[ttlMs - band, ttlMs + band]` where `band = floor(ttlMs * ratio)`.
 */
function applyTtlJitter(ttlMs: number, ratio: number): number {
  if (ratio <= 0) return ttlMs;
  const band = Math.floor(ttlMs * Math.min(ratio, 0.5));
  if (band === 0) return ttlMs;
  const r = randomBytes(4);
  const u = new DataView(r.buffer, r.byteOffset, r.byteLength).getUint32(0, false);
  const span = 2 * band + 1;
  const signed = (u % span) - band;
  return Math.max(1, ttlMs + signed);
}
