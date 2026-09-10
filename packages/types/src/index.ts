/**
 * @anonym-messenger/types
 *
 * Shared type contracts. This package MUST NOT define:
 *   - User / Account / Profile with personal fields (MASTER_SYSTEM 2.1)
 *   - PaidUser flag or subscription record (MASTER_SYSTEM 2.6)
 *   - Online / LastSeen / TypingStatus (MASTER_SYSTEM 12)
 *   - Persistent chat history envelope (MASTER_SYSTEM 2.2)
 */

export const PROTOCOL_VERSION = '0.0.2' as const;
export type ProtocolVersion = typeof PROTOCOL_VERSION;

/* ------------------------------------------------------------------------- */
/* OpaqueId                                                                  */
/* ------------------------------------------------------------------------- */

declare const __opaqueIdBrand: unique symbol;
export type OpaqueId<Kind extends string> = string & {
  readonly [__opaqueIdBrand]: Kind;
};

export function asOpaqueId<Kind extends string>(value: string, _kind: Kind): OpaqueId<Kind> {
  return value as OpaqueId<Kind>;
}

/* ------------------------------------------------------------------------- */
/* Timestamp                                                                 */
/* ------------------------------------------------------------------------- */

declare const __timestampBrand: unique symbol;
export type Timestamp = number & {
  readonly [__timestampBrand]: 'Timestamp';
};

export function asTimestamp(ms: number): Timestamp {
  return ms as Timestamp;
}

/* ------------------------------------------------------------------------- */
/* Ephemeral<T>                                                              */
/* ------------------------------------------------------------------------- */

declare const __ephemeralBrand: unique symbol;
export type Ephemeral<T> = T & {
  readonly [__ephemeralBrand]: 'Ephemeral';
};

export function asEphemeral<T>(value: T): Ephemeral<T> {
  return value as Ephemeral<T>;
}

/* ------------------------------------------------------------------------- */
/* Identity types (Phase 1)                                                  */
/* ------------------------------------------------------------------------- */

export type {
  Seed,
  RecoveryString,
  IdentityFingerprint,
  IdentityContext,
  RootIdentity,
  DerivedIdentity,
  SecureMemoryLike,
} from './identity';

/* ------------------------------------------------------------------------- */
/* Messaging types (Phase 2)                                                 */
/* ------------------------------------------------------------------------- */

export {
  MESSAGE_PROTOCOL_VERSION,
  asMessageCounter,
  type MessageCounter,
  type MessageInnerEnvelope,
  type MessageOuterEnvelope,
  type MessageProtocolVersion,
  type MessageSessionDescriptor,
  type MessageSessionId,
  type SessionRole,
} from './messaging';
