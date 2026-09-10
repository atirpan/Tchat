import { asOpaqueId, type IdentityContext } from '@anonym-messenger/types';

import { DerivationService } from './derivation.service';
import { SeedService } from './seed.service';

describe('DerivationService', () => {
  const seeds = new SeedService();
  const deriver = new DerivationService();

  const contextA: IdentityContext = {
    label: asOpaqueId('peer-A', 'derivation-label'),
    epoch: 0,
  };
  const contextB: IdentityContext = {
    label: asOpaqueId('peer-B', 'derivation-label'),
    epoch: 0,
  };

  it('deriveRoot produces a non-empty master handle', () => {
    const seed = seeds.generate();
    const root = deriver.deriveRoot(seed);
    expect(root.master.length).toBe(64);
    expect(root.master.destroyed).toBe(false);
    root.destroy();
    seed.zero();
    expect(root.master.destroyed).toBe(true);
  });

  it('deriveForContext is deterministic for the same (root, context)', () => {
    const seed = seeds.generate();
    const root = deriver.deriveRoot(seed);
    const a1 = deriver.deriveForContext(root, contextA);
    const a2 = deriver.deriveForContext(root, contextA);
    expect(a1.fingerprint).toBe(a2.fingerprint);
    a1.destroy();
    a2.destroy();
    root.destroy();
    seed.zero();
  });

  it('different contexts produce different fingerprints (unlinkability surface)', () => {
    const seed = seeds.generate();
    const root = deriver.deriveRoot(seed);
    const a = deriver.deriveForContext(root, contextA);
    const b = deriver.deriveForContext(root, contextB);
    expect(a.fingerprint).not.toBe(b.fingerprint);
    a.destroy();
    b.destroy();
    root.destroy();
    seed.zero();
  });

  it('different epochs produce different fingerprints (rotation surface)', () => {
    const seed = seeds.generate();
    const root = deriver.deriveRoot(seed);
    const e0 = deriver.deriveForContext(root, { ...contextA, epoch: 0 });
    const e1 = deriver.deriveForContext(root, { ...contextA, epoch: 1 });
    expect(e0.fingerprint).not.toBe(e1.fingerprint);
    e0.destroy();
    e1.destroy();
    root.destroy();
    seed.zero();
  });

  it('different seeds never collide to the same derived fingerprint', () => {
    const seed1 = seeds.generate();
    const seed2 = seeds.generate();
    const r1 = deriver.deriveRoot(seed1);
    const r2 = deriver.deriveRoot(seed2);
    const d1 = deriver.deriveForContext(r1, contextA);
    const d2 = deriver.deriveForContext(r2, contextA);
    expect(d1.fingerprint).not.toBe(d2.fingerprint);
    d1.destroy();
    d2.destroy();
    r1.destroy();
    r2.destroy();
    seed1.zero();
    seed2.zero();
  });

  it('rejects negative / non-integer epoch', () => {
    const seed = seeds.generate();
    const root = deriver.deriveRoot(seed);
    expect(() => deriver.deriveForContext(root, { label: contextA.label, epoch: -1 })).toThrow(
      RangeError,
    );
    expect(() => deriver.deriveForContext(root, { label: contextA.label, epoch: 1.5 })).toThrow(
      RangeError,
    );
    root.destroy();
    seed.zero();
  });
});
