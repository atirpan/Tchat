/**
 * apps/api entrypoint.
 *
 * Boot modes (see src/boot/boot-mode.ts):
 *   - standalone : Phase 0 default. Builds the module graph, closes cleanly.
 *   - http       : reserved for Phase 1+. Throws until audit approval.
 *
 * MASTER_SYSTEM section 2.5 forbids exposing an HTTP surface before identity
 * and security primitives exist. We keep the binding code path off until an
 * audit flips it on explicitly.
 */
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { BootModeNotYetAllowedError, resolveBootMode } from './boot/boot-mode';

async function bootStandalone(): Promise<void> {
  // No network listener, no logger. Section 2.3: no behavioral tracking.
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  await app.close();
}

async function bootHttp(): Promise<never> {
  // Intentionally throws in Phase 0. Phase 1+ will replace this body with a
  // guarded `NestFactory.create(AppModule)` bound to a loopback address only,
  // behind audit approval.
  throw new BootModeNotYetAllowedError(
    'http',
    'Phase 0 does not expose an HTTP surface. Audit approval is required to enable this path.',
  );
}

async function bootstrap(): Promise<void> {
  const mode = resolveBootMode(process.env);
  switch (mode) {
    case 'standalone':
      await bootStandalone();
      return;
    case 'http':
      await bootHttp();
      return;
  }
}

void bootstrap();
