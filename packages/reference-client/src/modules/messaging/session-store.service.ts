/**
 * SessionStoreService
 *
 * Phase 2 hardening update: holds per-session `nonceSalt` (entropy mixed
 * into every nonce) and initializes `nextSendCounter` from the per-direction
 * random start offset so counters never begin at 0.
 *
 * All state is in-memory. No persistence.
 *
 * MASTER_SYSTEM references: 2.2 (ephemeral), 3.2 (isolation), 5 (RAM
 * clearing).
 */

import type { SecureMemory } from '@anonym-messenger/security';
import type { MessageSessionDescriptor, MessageSessionId } from '@anonym-messenger/types';
import type { Clock } from '@anonym-messenger/utils';
import { Inject, Injectable } from '@nestjs/common';

import { MAX_COUNTER } from './constants';
import { CLOCK_TOKEN } from './tokens';

export class SessionNotFoundError extends Error {
  constructor() {
    super('Session not found or expired.');
    this.name = 'SessionNotFoundError';
  }
}

export class CounterExhaustedError extends Error {
  constructor() {
    super('Session counter exhausted. Rotate the session.');
    this.name = 'CounterExhaustedError';
  }
}

export interface OpenSessionInput {
  descriptor: MessageSessionDescriptor;
  sendChainKey: SecureMemory;
  recvChainKey: SecureMemory;
  nonceSalt: Uint8Array;
  /** First counter this direction will send (random per session). */
  sendStartOffset: number;
}

export interface SessionSlot {
  descriptor: MessageSessionDescriptor;
  sendChainKey: SecureMemory;
  recvChainKey: SecureMemory;
  nonceSalt: Uint8Array;
  nextSendCounter: number;
}

@Injectable()
export class SessionStoreService {
  readonly #sessions: Map<MessageSessionId, SessionSlot> = new Map();

  constructor(@Inject(CLOCK_TOKEN) private readonly clock: Clock) {}

  open(input: OpenSessionInput): void {
    const existing = this.#sessions.get(input.descriptor.sessionId);
    if (existing) {
      existing.sendChainKey.zero();
      existing.recvChainKey.zero();
      existing.nonceSalt.fill(0);
    }
    this.#sessions.set(input.descriptor.sessionId, {
      descriptor: Object.freeze({ ...input.descriptor }),
      sendChainKey: input.sendChainKey,
      recvChainKey: input.recvChainKey,
      nonceSalt: input.nonceSalt,
      nextSendCounter: input.sendStartOffset,
    });
  }

  require(sessionId: MessageSessionId): SessionSlot {
    const slot = this.#sessions.get(sessionId);
    if (!slot) throw new SessionNotFoundError();
    if ((this.clock.now() as number) >= slot.descriptor.expiresAtMs) {
      this.close(sessionId);
      throw new SessionNotFoundError();
    }
    return slot;
  }

  takeSendCounter(sessionId: MessageSessionId): number {
    const slot = this.require(sessionId);
    if (slot.nextSendCounter >= MAX_COUNTER) throw new CounterExhaustedError();
    return slot.nextSendCounter++;
  }

  commitSend(sessionId: MessageSessionId, expectedCounter: number, next: SecureMemory): void {
    const slot = this.require(sessionId);
    if (slot.nextSendCounter !== expectedCounter || expectedCounter >= MAX_COUNTER) {
      throw new CounterExhaustedError();
    }
    slot.sendChainKey.zero();
    slot.sendChainKey = next;
    slot.nextSendCounter++;
  }

  replaceSendChainKey(sessionId: MessageSessionId, next: SecureMemory): void {
    const slot = this.require(sessionId);
    slot.sendChainKey.zero();
    slot.sendChainKey = next;
  }

  replaceRecvChainKey(sessionId: MessageSessionId, next: SecureMemory): void {
    const slot = this.require(sessionId);
    slot.recvChainKey.zero();
    slot.recvChainKey = next;
  }

  close(sessionId: MessageSessionId): void {
    const slot = this.#sessions.get(sessionId);
    if (!slot) return;
    slot.sendChainKey.zero();
    slot.recvChainKey.zero();
    slot.nonceSalt.fill(0);
    this.#sessions.delete(sessionId);
  }

  closeAll(): void {
    for (const id of this.#sessions.keys()) this.close(id);
  }

  describe(sessionId: MessageSessionId): MessageSessionDescriptor {
    return this.require(sessionId).descriptor;
  }
}
