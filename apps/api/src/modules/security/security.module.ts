import { Global, Module } from '@nestjs/common';

/**
 * Security Module (MASTER_SYSTEM section 3 + section 4).
 *
 * Acts as a GLOBAL layer across the modular monolith. Marked @Global so
 * future security primitives (from packages/security) can be provided here
 * once and consumed module-wide without re-imports.
 *
 * Includes (deferred to Phase 3):
 *   - screenshot blocking
 *   - memory clearing
 *   - fake UI mode
 *
 * Phase 0: empty global shell.
 */
@Global()
@Module({})
export class SecurityModule {}
