import { createSystemClock } from '@anonym-messenger/utils';
import { Module } from '@nestjs/common';

import { MessageDerivationService } from './message-derivation.service';
import { MessageOpenService } from './message-open.service';
import { MessageSealService } from './message-seal.service';
import { MessagingService } from './messaging.service';
import { ReplayGuardService } from './replay-guard.service';
import { SessionStoreService } from './session-store.service';
import { CLOCK_TOKEN } from './tokens';

/**
 * Messaging Module (Phase 2).
 *
 * See README.md for the full responsibilities / allowed / forbidden list.
 *
 * Providers:
 *   - CLOCK_TOKEN: sanctioned system clock
 *   - SessionStoreService: in-RAM per-session state
 *   - ReplayGuardService: per-session counter acceptance
 *   - MessageDerivationService: HKDF-SHA512 chain + per-message material
 *   - MessageSealService / MessageOpenService
 *   - MessagingService: public API (exported)
 */
@Module({
  providers: [
    {
      provide: CLOCK_TOKEN,
      useFactory: () => createSystemClock(),
    },
    SessionStoreService,
    ReplayGuardService,
    MessageDerivationService,
    MessageSealService,
    MessageOpenService,
    MessagingService,
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
