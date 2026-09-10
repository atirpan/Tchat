import { hkdfSync } from 'node:crypto';

import { hkdf } from './hkdf';

describe('HKDF-SHA512 reference compatibility', () => {
  it.each([1, 32, 64, 65, 128, 1024])('matches the native provider at length %i', (length) => {
    const ikm = new Uint8Array(32).fill(11);
    const salt = new Uint8Array([1, 2, 3]);
    const info = new TextEncoder().encode('synthetic test context');
    expect(hkdf(ikm, salt, info, length)).toEqual(
      new Uint8Array(hkdfSync('sha512', ikm, salt, info, length)),
    );
    expect(ikm).toEqual(new Uint8Array(32).fill(11));
  });
});
