import { createSecureMemory } from './secure-memory';

describe('SecureMemory borrowed views', () => {
  it('clears a retained callback view without destroying the owner', () => {
    const memory = createSecureMemory(new Uint8Array([1, 2, 3]));
    const borrowed = memory.withBytes((view) => view);
    expect(borrowed).toEqual(new Uint8Array(3));
    expect(memory.withBytes((view) => Array.from(view))).toEqual([1, 2, 3]);
    memory.zero();
    expect(() => memory.withBytes(() => null)).toThrow();
  });

  it('clears callback views when the callback throws', () => {
    const memory = createSecureMemory(new Uint8Array([7]));
    let borrowed: Uint8Array | undefined;
    expect(() =>
      memory.withBytes((view) => {
        borrowed = view;
        throw new Error('test');
      }),
    ).toThrow('test');
    expect(borrowed).toEqual(new Uint8Array(1));
    memory.zero();
  });
});
