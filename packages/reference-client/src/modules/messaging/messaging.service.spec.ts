import { createSecureMemory, randomBytes } from '@anonym-messenger/security';
import { asTimestamp } from '@anonym-messenger/types';
import { createFrozenClock } from '@anonym-messenger/utils';
import { Test } from '@nestjs/testing';

import { DEFAULT_SESSION_TTL_MS } from './constants';
import { MessageDerivationService } from './message-derivation.service';
import { InvalidEnvelopeError, MessageOpenService, SanityError } from './message-open.service';
import { MessageSealService } from './message-seal.service';
import { MessagingService } from './messaging.service';
import { ReplayError, ReplayGuardService } from './replay-guard.service';
import { SessionStoreService } from './session-store.service';
import { CLOCK_TOKEN } from './tokens';

const NOW = 1_700_000_000_000;

async function build() {
  const clock = createFrozenClock(asTimestamp(NOW));
  const moduleRef = await Test.createTestingModule({
    providers: [
      { provide: CLOCK_TOKEN, useValue: clock },
      SessionStoreService,
      ReplayGuardService,
      MessageDerivationService,
      MessageSealService,
      MessageOpenService,
      MessagingService,
    ],
  }).compile();
  return {
    svc: moduleRef.get(MessagingService),
    derivation: moduleRef.get(MessageDerivationService),
  };
}

function makeSharedSecret() {
  return createSecureMemory(randomBytes(32));
}

describe('MessagingService — seal / open round-trip (hardened)', () => {
  it('preserves send state if the chain provider fails after encryption', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();
    const desc = a.svc.openSession(secret, 'initiator', { sessionSalt: salt, ttlJitterRatio: 0 });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });
    const fault = jest.spyOn(a.derivation, 'ratchetChain').mockImplementationOnce(() => {
      throw new Error('synthetic provider failure');
    });
    try {
      const input = {
        sessionId: desc.sessionId,
        contentType: 'text/plain',
        body: new Uint8Array([42]),
      };
      expect(() => a.svc.seal(input)).toThrow('synthetic provider failure');
      expect(b.svc.open(a.svc.seal(input)).body).toEqual(new Uint8Array([42]));
    } finally {
      fault.mockRestore();
      a.svc.destroyAll();
      b.svc.destroyAll();
      secret.zero();
    }
  });
  it('does not consume a send counter when caller input is invalid', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();
    const desc = a.svc.openSession(secret, 'initiator', { sessionSalt: salt, ttlJitterRatio: 0 });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });
    try {
      const input = {
        sessionId: desc.sessionId,
        contentType: 'text/plain',
        body: new Uint8Array([7]),
      };
      expect(() => a.svc.seal({ ...input, contentType: 'x'.repeat(256) })).toThrow();
      expect(() => a.svc.seal({ ...input, sentAt: NaN })).toThrow();
      expect(() => a.svc.seal({ ...input, body: new Uint8Array(1024 * 1024) })).toThrow();
      expect(b.svc.open(a.svc.seal(input)).body).toEqual(new Uint8Array([7]));
    } finally {
      a.svc.destroyAll();
      b.svc.destroyAll();
      secret.zero();
    }
  });
  it('preserves reception after repeated malformed and forged packets', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();
    const desc = a.svc.openSession(secret, 'initiator', { sessionSalt: salt, ttlJitterRatio: 0 });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });
    try {
      for (let step = 0; step < 32; step++) {
        const env = a.svc.seal({
          sessionId: desc.sessionId,
          contentType: 'text/plain',
          body: new Uint8Array([step]),
        });
        const badNonce = new Uint8Array(env.nonce);
        badNonce[0] = (badNonce[0] ?? 0) ^ 1;
        const packets = [
          { ...env, nonce: badNonce },
          { ...env, counter: (env.counter + 100000) as typeof env.counter },
          { ...env, counter: Number.MAX_SAFE_INTEGER as typeof env.counter },
          { ...env, ciphertext: new Uint8Array(1024 * 1024 + 1) },
          { ...env, sessionId: 'A'.repeat(22) as typeof env.sessionId },
          { ...env, nonce: new Uint8Array(0) },
        ];
        for (const packet of packets) expect(() => b.svc.open(packet)).toThrow();
        expect(b.svc.open(env).body).toEqual(new Uint8Array([step]));
        expect(() => b.svc.open(env)).toThrow(ReplayError);
      }
    } finally {
      a.svc.destroyAll();
      b.svc.destroyAll();
      secret.zero();
    }
  });

  it('rejects a future valid packet and accepts it after the missing packet', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();
    const desc = a.svc.openSession(secret, 'initiator', { sessionSalt: salt, ttlJitterRatio: 0 });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });
    try {
      const first = a.svc.seal({
        sessionId: desc.sessionId,
        contentType: 'text/plain',
        body: new Uint8Array([1]),
      });
      const second = a.svc.seal({
        sessionId: desc.sessionId,
        contentType: 'text/plain',
        body: new Uint8Array([2]),
      });
      expect(() => b.svc.open(second)).toThrow(ReplayError);
      expect(b.svc.open(first).body).toEqual(new Uint8Array([1]));
      expect(b.svc.open(second).body).toEqual(new Uint8Array([2]));
    } finally {
      a.svc.destroyAll();
      b.svc.destroyAll();
      secret.zero();
    }
  });
  it('round-trips plaintext across initiator -> responder', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();

    const descA = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt,
      ttlJitterRatio: 0,
    });
    const descB = b.svc.openSession(secret, 'responder', {
      sessionSalt: salt,
      ttlJitterRatio: 0,
    });
    expect(descA.sessionId).toBe(descB.sessionId);

    const env = a.svc.seal({
      sessionId: descA.sessionId,
      contentType: 'text/plain',
      body: new TextEncoder().encode('hello world'),
    });

    // Outer envelope carries NO identity AND NO salt.
    expect(Object.keys(env).sort()).toEqual(
      ['ciphertext', 'counter', 'nonce', 'sessionId', 'v'].sort(),
    );
    // Counter MUST NOT be zero-based (hardening #2).
    expect(env.counter).toBeGreaterThan(0);

    const inner = b.svc.open(env);
    expect(inner.contentType).toBe('text/plain');
    expect(new TextDecoder().decode(inner.body)).toBe('hello world');

    a.svc.destroyAll();
    b.svc.destroyAll();
    secret.zero();
  });

  it('same shared secret + different session salts produce different session ids', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const saltA = a.svc.generateSessionSalt();
    const saltB = a.svc.generateSessionSalt();

    const descA = a.svc.openSession(secret, 'initiator', {
      sessionSalt: saltA,
      ttlJitterRatio: 0,
    });
    const descB = b.svc.openSession(secret, 'initiator', {
      sessionSalt: saltB,
      ttlJitterRatio: 0,
    });
    expect(descA.sessionId).not.toBe(descB.sessionId);

    a.svc.destroyAll();
    b.svc.destroyAll();
    secret.zero();
  });

  it('counter sequence is monotonic starting from the random offset', async () => {
    const a = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();
    const desc = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt,
      ttlJitterRatio: 0,
    });

    const counters: number[] = [];
    for (let i = 0; i < 3; i++) {
      const env = a.svc.seal({
        sessionId: desc.sessionId,
        contentType: 'text/plain',
        body: new Uint8Array([i]),
      });
      counters.push(env.counter as unknown as number);
    }
    const firstCounter = counters[0];
    if (firstCounter === undefined) throw new Error('missing first counter');
    expect(counters[1]).toBe(firstCounter + 1);
    expect(counters[2]).toBe(firstCounter + 2);

    a.svc.destroyAll();
    secret.zero();
  });

  it('rejects an envelope whose counter is below the recv start offset', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();

    const descA = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt,
      ttlJitterRatio: 0,
    });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });

    // Forge an envelope with counter=0; should fail the replay guard BEFORE
    // reaching the AEAD because the real recv-start offset is >= 0 but the
    // initiator's sendStartOffset is >0 almost surely, meaning the peer's
    // replay guard was primed with a non-zero minAcceptable.
    const normal = a.svc.seal({
      sessionId: descA.sessionId,
      contentType: 'text/plain',
      body: new Uint8Array([1]),
    });
    const forged = { ...normal, counter: 0 as unknown as typeof normal.counter };
    expect(() => b.svc.open(forged)).toThrow(ReplayError);

    a.svc.destroyAll();
    b.svc.destroyAll();
    secret.zero();
  });

  it('rejects tampered ciphertext', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();

    const descA = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt,
      ttlJitterRatio: 0,
    });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });

    const env = a.svc.seal({
      sessionId: descA.sessionId,
      contentType: 'text/plain',
      body: new TextEncoder().encode('x'),
    });
    const tampered = {
      ...env,
      ciphertext: (() => {
        const c = new Uint8Array(env.ciphertext);
        c[0] = (c[0] ?? 0) ^ 0xff;
        return c;
      })(),
    };
    expect(() => b.svc.open(tampered)).toThrow(InvalidEnvelopeError);
    expect(new TextDecoder().decode(b.svc.open(env).body)).toBe('x');
    const next = a.svc.seal({
      sessionId: descA.sessionId,
      contentType: 'text/plain',
      body: new Uint8Array([42]),
    });
    expect(b.svc.open(next).body).toEqual(new Uint8Array([42]));

    a.svc.destroyAll();
    b.svc.destroyAll();
    secret.zero();
  });

  it('applies TTL jitter — ttlJitterRatio>0 varies expiresAtMs across sessions', async () => {
    const a = await build();
    const secret = makeSharedSecret();
    const expirations = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const salt = a.svc.generateSessionSalt();
      const desc = a.svc.openSession(secret, 'initiator', {
        sessionSalt: salt,
        ttlMs: DEFAULT_SESSION_TTL_MS,
        ttlJitterRatio: 0.1,
      });
      expirations.add(desc.expiresAtMs);
      a.svc.destroySession(desc);
    }
    // With 10% jitter we should see variance. Probability that all 20 are
    // identical is vanishing.
    expect(expirations.size).toBeGreaterThan(1);
    secret.zero();
  });

  it('ttlJitterRatio=0 yields deterministic expiresAtMs (unit-test friendly)', async () => {
    const a = await build();
    const secret = makeSharedSecret();
    const salt1 = a.svc.generateSessionSalt();
    const salt2 = a.svc.generateSessionSalt();
    const d1 = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt1,
      ttlMs: 1000,
      ttlJitterRatio: 0,
    });
    const d2 = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt2,
      ttlMs: 1000,
      ttlJitterRatio: 0,
    });
    expect(d1.expiresAtMs).toBe(NOW + 1000);
    expect(d2.expiresAtMs).toBe(NOW + 1000);
    a.svc.destroyAll();
    secret.zero();
  });

  it('rejects messages claiming a sentAt too far in the future', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();

    const descA = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt,
      ttlJitterRatio: 0,
    });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });

    const env = a.svc.seal({
      sessionId: descA.sessionId,
      contentType: 'text/plain',
      body: new Uint8Array([1]),
      sentAt: NOW + 10 * 60 * 1000,
    });
    expect(() => b.svc.open(env)).toThrow(SanityError);

    a.svc.destroyAll();
    b.svc.destroyAll();
    secret.zero();
  });

  it('replay of the same envelope is rejected', async () => {
    const a = await build();
    const b = await build();
    const secret = makeSharedSecret();
    const salt = a.svc.generateSessionSalt();

    const descA = a.svc.openSession(secret, 'initiator', {
      sessionSalt: salt,
      ttlJitterRatio: 0,
    });
    b.svc.openSession(secret, 'responder', { sessionSalt: salt, ttlJitterRatio: 0 });

    const env = a.svc.seal({
      sessionId: descA.sessionId,
      contentType: 'text/plain',
      body: new Uint8Array([1]),
    });
    b.svc.open(env);
    expect(() => b.svc.open(env)).toThrow(ReplayError);

    a.svc.destroyAll();
    b.svc.destroyAll();
    secret.zero();
  });
});
