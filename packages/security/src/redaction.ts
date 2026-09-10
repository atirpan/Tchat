/**
 * Redaction utilities
 *
 * Any value that reaches a log sink, an error message, a stack trace, or a
 * serialized response MUST pass through redaction first. Phase 0 defines the
 * contract and provides only the safest default: replace everything with a
 * fixed token.
 *
 * MASTER_SYSTEM references:
 *   - section 2.3: no message logging, no behavior tracking
 *   - section 5:   no system-level leakage
 *   - section 11:  no plaintext sensitive data
 */

/** Stable token. MUST NOT encode any information about the original value. */
export const REDACTED = '[REDACTED]' as const;
export type Redacted = typeof REDACTED;

/**
 * Keys that, if seen anywhere in an object graph, MUST be redacted. This list
 * is conservative by design and is expected to grow, never shrink.
 */
export const ALWAYS_REDACT_KEYS: ReadonlySet<string> = new Set([
  // credentials / secrets
  'password',
  'passphrase',
  'secret',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'privateKey',
  'private_key',
  'signingKey',
  'signing_key',
  'seed',
  'mnemonic',
  // network / device metadata
  'ip',
  'ipAddress',
  'ip_address',
  'userAgent',
  'user_agent',
  'deviceId',
  'device_id',
  'fingerprint',
  // personal identifiers (must never be collected, but redacted if seen)
  'email',
  'phone',
  // message content
  'message',
  'messageBody',
  'plaintext',
  // correlation surfaces added in Phase 0b refinement:
  // any of these can re-link sessions or reveal relationships
  // (MASTER_SYSTEM 2.1, 2.4, 6).
  'session',
  'sessionId',
  'session_id',
  'conversationId',
  'conversation_id',
  'peerId',
  'peer_id',
  'roomId',
  'room_id',
  // generic containers that commonly carry sensitive sub-trees; redacted
  // as a whole so we never leak a nested field by accident.
  'metadata',
  'payload',
  'headers',
]);

/**
 * Redact a single value. Phase 0 replaces ANY non-undefined value with the
 * `REDACTED` token. The contract is deliberately pessimistic: if in doubt,
 * redact. Phase 3 will add typed carve-outs (e.g. opaque IDs pass through).
 */
export function redactValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  return REDACTED;
}

/**
 * Fail-closed boundary for arbitrary application data.
 *
 * Do not enumerate keys or read properties: key names, object shape, unknown
 * strings and accessor side effects can all disclose sensitive information.
 * Operational diagnostics require a separate typed allowlist of fixed events.
 * The legacy second argument remains accepted for source compatibility only.
 */
export function redactObject<T>(input: T, _seen?: WeakSet<object>): unknown {
  return redactValue(input);
}
