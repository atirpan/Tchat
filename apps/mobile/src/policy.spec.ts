import { validateAlias } from './policy';

describe('mobile alias policy', () => {
  it('normalizes case and accepts the safe grammar', () => {
    expect(validateAlias('Aykan_42')).toEqual({ ok: true, normalized: 'aykan_42' });
  });

  it('rejects reserved names and Unicode confusables', () => {
    expect(validateAlias('admin')).toEqual({ ok: false, reason: 'reserved' });
    expect(validateAlias('аykan')).toEqual({ ok: false, reason: 'character' });
  });

  it('does not turn prefix or directory behavior into a local match', () => {
    expect(validateAlias('aykan/other')).toEqual({ ok: false, reason: 'character' });
    expect(validateAlias('ay')).toEqual({ ok: false, reason: 'length' });
  });
});
