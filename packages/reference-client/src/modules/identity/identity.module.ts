import { createRamSafeStorage } from '@anonym-messenger/security';
import { createSystemClock } from '@anonym-messenger/utils';
import { Module } from '@nestjs/common';

import { DerivationService } from './derivation.service';
import { IdentityService, SAFE_STORAGE_TOKEN } from './identity.service';
import { SeedService } from './seed.service';

/**
 * Identity Module (Phase 1).
 *
 * Responsibilities, allowed and forbidden items: see README.md.
 *
 * Wiring:
 *   - SeedService: CSPRNG-backed seed generation + recovery string codec.
 *   - DerivationService: HKDF-SHA512 root + per-context derivation.
 *   - IdentityService: session-scoped API.
 *   - SAFE_STORAGE_TOKEN: RAM-only, Clock-enforced TTL storage. No disk.
 */
@Module({
  providers: [
    SeedService,
    DerivationService,
    {
      provide: SAFE_STORAGE_TOKEN,
      useFactory: () => createRamSafeStorage(createSystemClock()),
    },
    IdentityService,
  ],
  exports: [IdentityService],
})
export class IdentityModule {}
