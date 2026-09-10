import { InvalidRecoveryStringError, SeedService } from './seed.service';

describe('SeedService', () => {
  const seeds = new SeedService();

  it('generates 32-byte seeds', () => {
    const sm = seeds.generate();
    sm.withBytes((bytes) => {
      expect(bytes.byteLength).toBe(32);
    });
    sm.zero();
  });

  it('generates unique seeds across calls (CSPRNG sanity)', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 64; i++) {
      const sm = seeds.generate();
      sm.withBytes((bytes) => samples.add(Buffer.from(bytes).toString('hex')));
      sm.zero();
    }
    // 64 random 32-byte values should all be unique with overwhelming probability.
    expect(samples.size).toBe(64);
  });

  it('round-trips recovery strings', () => {
    const sm = seeds.generate();
    const original = Buffer.from(sm.withBytes((b) => b.slice())).toString('hex');
    const recovery = seeds.toRecoveryString(sm);
    sm.zero();
    const restored = seeds.fromRecoveryString(recovery);
    const restoredHex = Buffer.from(restored.withBytes((b) => b.slice())).toString('hex');
    restored.zero();
    expect(restoredHex).toBe(original);
  });

  it('rejects empty recovery strings', () => {
    expect(() => seeds.fromRecoveryString('' as never)).toThrow(InvalidRecoveryStringError);
  });

  it('rejects wrong-length recovery strings', () => {
    // base64url of 5 random bytes — far too short.
    const shortString = Buffer.from([1, 2, 3, 4, 5]).toString('base64url');
    expect(() => seeds.fromRecoveryString(shortString as never)).toThrow(
      InvalidRecoveryStringError,
    );
  });

  it('rejects recovery strings with a corrupted checksum (constant-time branch)', () => {
    const sm = seeds.generate();
    const rec = seeds.toRecoveryString(sm) as unknown as string;
    sm.zero();
    // Flip the last base64url character to force a checksum mismatch.
    const flipped = rec.slice(0, -1) + (rec.endsWith('A') ? 'B' : 'A');
    expect(() => seeds.fromRecoveryString(flipped as never)).toThrow(InvalidRecoveryStringError);
  });

  it('marks SecureMemory destroyed after zero()', () => {
    const sm = seeds.generate();
    expect(sm.destroyed).toBe(false);
    sm.zero();
    expect(sm.destroyed).toBe(true);
    expect(() => sm.withBytes(() => undefined)).toThrow();
  });
});
