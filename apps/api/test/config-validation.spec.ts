import {
  BOOT_MODES,
  DEFAULT_BOOT_MODE,
  UnknownBootModeError,
  resolveBootMode,
} from '../src/boot/boot-mode';

/**
 * Config validation test (Phase 0).
 *
 * Phase 0 has exactly one piece of runtime configuration: BOOT_MODE. This
 * suite locks the contract so future phases cannot widen it silently.
 */
describe('boot-mode config', () => {
  it('defaults to standalone when BOOT_MODE is unset', () => {
    expect(resolveBootMode({})).toBe(DEFAULT_BOOT_MODE);
    expect(resolveBootMode({ BOOT_MODE: '' })).toBe(DEFAULT_BOOT_MODE);
    expect(resolveBootMode({ BOOT_MODE: '   ' })).toBe(DEFAULT_BOOT_MODE);
  });

  it.each(BOOT_MODES)('accepts known mode "%s"', (mode) => {
    expect(resolveBootMode({ BOOT_MODE: mode })).toBe(mode);
  });

  it('rejects unknown modes', () => {
    expect(() => resolveBootMode({ BOOT_MODE: 'cluster' })).toThrow(UnknownBootModeError);
    expect(() => resolveBootMode({ BOOT_MODE: 'HTTP' })).toThrow(UnknownBootModeError);
  });
});
