import { ALWAYS_REDACT_KEYS, REDACTED, redactObject, redactValue } from './redaction';

describe('fail-closed redaction', () => {
  it.each(['synthetic secret', 42, true, null, 7n, Symbol('secret')])(
    'redacts scalar input without serializing it',
    (value) => {
      expect(redactValue(value)).toBe(REDACTED);
      expect(redactObject(value)).toBe(REDACTED);
    },
  );

  it('keeps absent values absent', () => {
    expect(redactValue(undefined)).toBeUndefined();
    expect(redactObject(undefined)).toBeUndefined();
  });

  it.each([
    'seed',
    'privateKey',
    'fingerprint',
    'conversationId',
    'peerId',
    'sessionId',
    'payload',
    'headers',
    'ip',
  ])('retains legacy sensitive key %s', (key) => {
    expect(ALWAYS_REDACT_KEYS.has(key)).toBe(true);
  });

  it('redacts unknown names, identifier-shaped keys and nested arrays entirely', () => {
    const input = {
      'synthetic-peer-id': [{ unknown: 'synthetic plaintext', MAC: '00:00:00:00:00:00' }],
    };
    expect(redactObject(input)).toBe(REDACTED);
    expect(JSON.stringify(redactObject(input))).not.toContain('synthetic');
  });

  it('never invokes getters, toJSON, proxy traps or serialization hooks', () => {
    const fail = jest.fn(() => {
      throw new Error('Synthetic accessor invoked');
    });
    const proxy = new Proxy({}, { ownKeys: fail, get: fail, getPrototypeOf: fail });
    const accessor = Object.defineProperty({}, 'secret', { get: fail, enumerable: true });
    for (const input of [proxy, accessor, { toJSON: fail }]) {
      expect(redactObject(input)).toBe(REDACTED);
    }
    expect(fail).not.toHaveBeenCalled();
  });

  it('handles cycles and deeply nested objects without traversal or stack overflow', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    let deep: unknown = cycle;
    for (let i = 0; i < 100_000; i += 1) deep = { nested: deep };
    expect(redactObject(deep)).toBe(REDACTED);
  });

  it('does not expose binary secret bytes or opaque exception messages', () => {
    expect(redactObject(new Uint8Array([1, 2, 3]))).toBe(REDACTED);
    expect(redactObject(new Error('synthetic secret'))).toBe(REDACTED);
  });
});
