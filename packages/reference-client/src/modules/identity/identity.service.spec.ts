import { createRamSafeStorage } from '@anonym-messenger/security';
import { asOpaqueId, asTimestamp } from '@anonym-messenger/types';
import { createFrozenClock } from '@anonym-messenger/utils';
import { Test } from '@nestjs/testing';

import { DerivationService } from './derivation.service';
import {
  IdentityService,
  NoActiveIdentitySessionError,
  SAFE_STORAGE_TOKEN,
} from './identity.service';
import { SeedService } from './seed.service';

/**
 * Integration tests for IdentityService. Uses a frozen Clock and the RAM
 * SafeStorage directly — no Nest module / no HTTP — so tests stay
 * hermetic and fast.
 */
describe('IdentityService', () => {
  const contextAlpha = {
    label: asOpaqueId('room/alpha', 'derivation-label'),
    epoch: 0,
  };
  const contextBeta = {
    label: asOpaqueId('room/beta', 'derivation-label'),
    epoch: 0,
  };

  async function build(): Promise<IdentityService> {
    const clock = createFrozenClock(asTimestamp(1_700_000_000_000));
    const storage = createRamSafeStorage(clock);
    const moduleRef = await Test.createTestingModule({
      providers: [
        SeedService,
        DerivationService,
        { provide: SAFE_STORAGE_TOKEN, useValue: storage },
        IdentityService,
      ],
    }).compile();
    return moduleRef.get(IdentityService);
  }

  it('createSession issues a recovery string and enables identity derivation', async () => {
    const id = await build();
    const rec = await id.createSession();
    expect(typeof rec).toBe('string');
    expect((rec as unknown as string).length).toBeGreaterThan(0);

    const der = id.identityFor(contextAlpha);
    expect(typeof der.fingerprint).toBe('string');
    expect((der.fingerprint as unknown as string).length).toBeGreaterThan(0);
    der.destroy();
    await id.destroy();
  });

  it('identityFor is deterministic within a session', async () => {
    const id = await build();
    await id.createSession();
    const a1 = id.identityFor(contextAlpha);
    const a2 = id.identityFor(contextAlpha);
    expect(a1.fingerprint).toBe(a2.fingerprint);
    a1.destroy();
    a2.destroy();
    await id.destroy();
  });

  it('different contexts yield different derived fingerprints', async () => {
    const id = await build();
    await id.createSession();
    const alpha = id.identityFor(contextAlpha);
    const beta = id.identityFor(contextBeta);
    expect(alpha.fingerprint).not.toBe(beta.fingerprint);
    alpha.destroy();
    beta.destroy();
    await id.destroy();
  });

  it('restoreSession replays the same derivation tree as the original seed', async () => {
    const id1 = await build();
    const recovery = await id1.createSession();
    const originalFingerprint = id1.identityFor(contextAlpha).fingerprint;

    const id2 = await build();
    await id2.restoreSession(recovery);
    const restoredFingerprint = id2.identityFor(contextAlpha).fingerprint;

    expect(restoredFingerprint).toBe(originalFingerprint);
    await id1.destroy();
    await id2.destroy();
  });

  it('identityFor throws when no session is active', async () => {
    const id = await build();
    expect(() => id.identityFor(contextAlpha)).toThrow(NoActiveIdentitySessionError);
  });

  it('destroy wipes the session — subsequent identityFor throws', async () => {
    const id = await build();
    await id.createSession();
    await id.destroy();
    expect(() => id.identityFor(contextAlpha)).toThrow(NoActiveIdentitySessionError);
  });

  it('exportRecovery returns a functional recovery string', async () => {
    const id1 = await build();
    await id1.createSession();
    const exported = await id1.exportRecovery();

    const id2 = await build();
    await id2.restoreSession(exported);
    const fp1 = id1.identityFor(contextAlpha).fingerprint;
    const fp2 = id2.identityFor(contextAlpha).fingerprint;
    expect(fp1).toBe(fp2);
    await id1.destroy();
    await id2.destroy();
  });

  it('IdentityService instances are never JSON-serializable in a sensitive way', async () => {
    const id = await build();
    await id.createSession();
    const derived = id.identityFor(contextAlpha);
    const json = JSON.stringify(derived);
    // The private material handle must not stringify to raw bytes.
    expect(json).not.toMatch(/[0-9a-f]{64,}/i);
    expect(json).toContain('SecureMemory');
    derived.destroy();
    await id.destroy();
  });
});
