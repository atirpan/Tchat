import { createSecureMemory, randomBytes } from '@anonym-messenger/security';
import { asMessageCounter } from '@anonym-messenger/types';

import { MessageDerivationService, InvalidSessionSaltError } from './message-derivation.service';

describe('MessageDerivationService (hardened)', () => {
  const svc = new MessageDerivationService();

  it('generateSessionSalt returns 16 random bytes', () => {
    const s1 = svc.generateSessionSalt();
    const s2 = svc.generateSessionSalt();
    expect(s1.byteLength).toBe(16);
    expect(Buffer.from(s1).toString('hex')).not.toBe(Buffer.from(s2).toString('hex'));
  });

  it('rejects an invalid sessionSalt', () => {
    const secret = createSecureMemory(randomBytes(32));
    const tooShort = randomBytes(15);
    expect(() => svc.deriveSession(secret, 'initiator', tooShort)).toThrow(InvalidSessionSaltError);
    secret.zero();
  });

  it('produces deterministic session material for the same (secret, salt)', () => {
    const secret = createSecureMemory(randomBytes(32));
    const salt = svc.generateSessionSalt();
    const a = svc.deriveSession(secret, 'initiator', salt);
    const b = svc.deriveSession(secret, 'initiator', salt);
    expect(a.sessionId).toBe(b.sessionId);
    expect(a.sendStartOffset).toBe(b.sendStartOffset);
    expect(a.recvStartOffset).toBe(b.recvStartOffset);
    expect(Buffer.from(a.nonceSalt).toString('hex')).toBe(Buffer.from(b.nonceSalt).toString('hex'));
    a.sendChainKey.zero();
    a.recvChainKey.zero();
    b.sendChainKey.zero();
    b.recvChainKey.zero();
    secret.zero();
  });

  it('same shared secret with DIFFERENT salts yields DIFFERENT session ids', () => {
    const secret = createSecureMemory(randomBytes(32));
    const saltA = svc.generateSessionSalt();
    const saltB = svc.generateSessionSalt();
    const a = svc.deriveSession(secret, 'initiator', saltA);
    const b = svc.deriveSession(secret, 'initiator', saltB);
    expect(a.sessionId).not.toBe(b.sessionId);
    a.sendChainKey.zero();
    a.recvChainKey.zero();
    b.sendChainKey.zero();
    b.recvChainKey.zero();
    secret.zero();
  });

  it('initiator.send corresponds to responder.recv (symmetric chain assignment)', () => {
    const secret = createSecureMemory(randomBytes(32));
    const salt = svc.generateSessionSalt();
    const ini = svc.deriveSession(secret, 'initiator', salt);
    const res = svc.deriveSession(secret, 'responder', salt);
    const iniSend = Buffer.from(ini.sendChainKey.withBytes((b) => b.slice())).toString('hex');
    const resRecv = Buffer.from(res.recvChainKey.withBytes((b) => b.slice())).toString('hex');
    expect(iniSend).toBe(resRecv);
    expect(ini.sendStartOffset).toBe(res.recvStartOffset);
    expect(ini.recvStartOffset).toBe(res.sendStartOffset);
    ini.sendChainKey.zero();
    ini.recvChainKey.zero();
    res.sendChainKey.zero();
    res.recvChainKey.zero();
    secret.zero();
  });

  it('counter start offsets are within the 24-bit band and usually non-zero', () => {
    // 64 sessions — with 24-bit offsets, the probability that ALL are 0
    // is (2^-24)^64, effectively zero.
    let anyNonZero = false;
    for (let i = 0; i < 64; i++) {
      const secret = createSecureMemory(randomBytes(32));
      const salt = svc.generateSessionSalt();
      const m = svc.deriveSession(secret, 'initiator', salt);
      expect(m.sendStartOffset).toBeGreaterThanOrEqual(0);
      expect(m.sendStartOffset).toBeLessThan(1 << 24);
      if (m.sendStartOffset !== 0) anyNonZero = true;
      m.sendChainKey.zero();
      m.recvChainKey.zero();
      secret.zero();
    }
    expect(anyNonZero).toBe(true);
  });

  it('per-message nonce includes the session nonceSalt (different salts -> different nonces)', () => {
    const secret = createSecureMemory(randomBytes(32));
    const saltA = svc.generateSessionSalt();
    const saltB = svc.generateSessionSalt();
    const a = svc.deriveSession(secret, 'initiator', saltA);
    const b = svc.deriveSession(secret, 'initiator', saltB);
    // Force the same chain key bytes by replacing b's send chain with a's.
    // This simulates the (theoretical) case where two sessions somehow had
    // the same chain key — the nonceSalt should still differ the nonces.
    const mA = svc.deriveMessageMaterial(a.sendChainKey, asMessageCounter(0), a.nonceSalt);
    const mB = svc.deriveMessageMaterial(a.sendChainKey, asMessageCounter(0), b.nonceSalt);
    expect(Buffer.from(mA.nonce).toString('hex')).not.toBe(Buffer.from(mB.nonce).toString('hex'));
    mA.key.zero();
    mB.key.zero();
    a.sendChainKey.zero();
    a.recvChainKey.zero();
    b.sendChainKey.zero();
    b.recvChainKey.zero();
    secret.zero();
  });

  it('ratchet produces a new chain key', () => {
    const secret = createSecureMemory(randomBytes(32));
    const salt = svc.generateSessionSalt();
    const m = svc.deriveSession(secret, 'initiator', salt);
    const before = Buffer.from(m.sendChainKey.withBytes((b) => b.slice())).toString('hex');
    const next = svc.ratchetChain(m.sendChainKey);
    const after = Buffer.from(next.withBytes((b) => b.slice())).toString('hex');
    expect(after).not.toBe(before);
    next.zero();
    m.sendChainKey.zero();
    m.recvChainKey.zero();
    secret.zero();
  });
});
