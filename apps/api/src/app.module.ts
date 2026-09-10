import { Module } from '@nestjs/common';

import { AnonymityModule } from './modules/anonymity/anonymity.module';
import { CommunityModule } from './modules/community/community.module';
import { MonetizationModule } from './modules/monetization/monetization.module';
import { NetworkModule } from './modules/network/network.module';
import { SecurityModule } from './modules/security/security.module';

/**
 * Root module.
 *
 * Each child module is an isolated shell. MASTER_SYSTEM section 3.2 forbids
 * cross-module logic leakage. This file is intentionally the ONLY place that
 * references all modules together.
 */
@Module({
  imports: [SecurityModule, AnonymityModule, NetworkModule, MonetizationModule, CommunityModule],
})
export class AppModule {}
