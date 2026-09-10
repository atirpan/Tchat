/**
 * Constants used by MessageOpenService. Split from `constants.ts` so the
 * open path pulls in the smallest possible surface.
 */
import { AEAD_NONCE_BYTES } from '@anonym-messenger/security';

import { MAX_FUTURE_SKEW_MS as _SKEW, MAX_MESSAGE_AGE_MS as _AGE } from './constants';

export const AEAD_NONCE_BYTES_EXPECTED = AEAD_NONCE_BYTES;
export const MAX_FUTURE_SKEW_MS = _SKEW;
export const MAX_MESSAGE_AGE_MS = _AGE;
