import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { AnonymityModule } from '../src/modules/anonymity/anonymity.module';
import { CommunityModule } from '../src/modules/community/community.module';
import { MonetizationModule } from '../src/modules/monetization/monetization.module';
import { NetworkModule } from '../src/modules/network/network.module';
import { SecurityModule } from '../src/modules/security/security.module';

/**
 * Module isolation test (Phase 0 placeholder).
 *
 * Verifies that each feature module can be instantiated on its own, without
 * dragging any other feature module into the graph. This is a necessary (not
 * sufficient) condition for MASTER_SYSTEM section 3.2 isolation.
 *
 * Phase 1+ will expand this to assert on the resolved provider graph.
 */
describe('module isolation (Phase 0)', () => {
  const modules = [
    { name: 'SecurityModule', ref: SecurityModule },
    { name: 'AnonymityModule', ref: AnonymityModule },
    { name: 'NetworkModule', ref: NetworkModule },
    { name: 'MonetizationModule', ref: MonetizationModule },
    { name: 'CommunityModule', ref: CommunityModule },
  ];

  for (const m of modules) {
    it(`${m.name} compiles in isolation`, async () => {
      const ref = await Test.createTestingModule({ imports: [m.ref] }).compile();
      await ref.close();
    });
  }

  it('AppModule composes all modules without runtime error', async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await ref.close();
  });
});
