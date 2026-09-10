/**
 * ReplayGuardService
 *
 * Phase 2 hardening update: session state now also tracks `minAcceptable`,
 * which equals the peer's random `recvStartOffset`. Counters below this
 * bound are rejected, closing the window between session open and first
 * message that would otherwise allow replaying a forged envelope with a
 * very small counter.
 *
 * MASTER_SYSTEM references: 2.5, 12.
 */
import type { MessageCounter, MessageSessionId } from '@anonym-messenger/types';
import { Injectable } from '@nestjs/common';

import { REPLAY_WINDOW } from './constants';

export class ReplayError extends Error {
  constructor(reason: string) {
    super(`Replay guard: ${reason}`);
    this.name = 'ReplayError';
  }
}

interface SessionReplayState {
  minAcceptable: number;
  highestSeen: number;
  seen: Set<number>;
}

@Injectable()
export class ReplayGuardService {
  readonly #state: Map<MessageSessionId, SessionReplayState> = new Map();

  /**
   * Initialize (or re-initialize) replay state for a session. Called by
   * `MessagingService.openSession` with the session's random recv start
   * offset. Idempotent replacement; previous state is dropped.
   */
  init(sessionId: MessageSessionId, minAcceptable: number): void {
    if (!Number.isInteger(minAcceptable) || minAcceptable < 0) {
      throw new ReplayError('minAcceptable must be a non-negative integer');
    }
    this.#state.set(sessionId, {
      minAcceptable,
      highestSeen: minAcceptable - 1,
      seen: new Set<number>(),
    });
  }

  accept(sessionId: MessageSessionId, counter: MessageCounter): void {
    this.check(sessionId, counter);
    const st = this.#state.get(sessionId);
    if (!st) throw new ReplayError('session not initialized');
    st.highestSeen = counter;
    st.seen.clear();
    st.seen.add(counter);
  }

  /** Read-only preflight. Commit only after authenticated decryption. */
  check(sessionId: MessageSessionId, counter: MessageCounter): void {
    if (!Number.isInteger(counter) || counter < 0) {
      throw new ReplayError('non-negative integer counter required');
    }
    const st = this.#state.get(sessionId);
    if (!st) {
      throw new ReplayError('session not initialized');
    }
    if (counter < st.minAcceptable) {
      throw new ReplayError('counter below session start offset');
    }
    if (counter + REPLAY_WINDOW < st.highestSeen) {
      throw new ReplayError('counter outside acceptance window');
    }
    if (st.seen.has(counter)) {
      throw new ReplayError('counter already seen');
    }
    if (counter !== st.highestSeen + 1) {
      throw new ReplayError('strictly sequential delivery required by test-only protocol');
    }
  }

  forget(sessionId: MessageSessionId): void {
    this.#state.delete(sessionId);
  }

  forgetAll(): void {
    this.#state.clear();
  }
}
