import { Test } from '@nestjs/testing';

import { AppModule } from './app.module';

/**
 * Phase 0 guardrail test.
 *
 * Verifies the module graph compiles without errors and closes cleanly. This
 * is what "mandatory tests" looks like when there is (correctly) no business
 * logic yet — MASTER_SYSTEM section 11.
 */
describe('AppModule (Phase 0)', () => {
  it('compiles the module graph and closes cleanly', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    await app.close();
  });
});
