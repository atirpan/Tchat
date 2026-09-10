import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import { preProcessFile } from 'typescript';

/**
 * Forbidden-imports test.
 *
 * Statically scans every module's source files and fails if it contains
 * an import path to another module that is forbidden by docs/MODULE_RULES.md.
 *
 * This is intentionally a coarse, string-level check. A richer AST-based
 * check will be introduced in Phase 1. For Phase 0, all modules are empty,
 * so the test just verifies that the scaffolding works.
 */

const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

// Pairs listed here MUST NEVER appear as `from '../<forbidden>/...'` in the
// importer module. Derived from docs/MODULE_RULES.md.
const FORBIDDEN_PAIRS: ReadonlyArray<readonly [string, string]> = [
  // identity must not import anything from other feature modules
  ['identity', 'messaging'],
  ['identity', 'network'],
  ['identity', 'anonymity'],
  ['identity', 'monetization'],
  ['identity', 'community'],
  // messaging may depend on DerivedIdentity as a TYPE (from
  // @anonym-messenger/types), but MUST NOT import from the identity
  // module directly. Phase 2 also forbids network / monetization / community
  // and anonymity imports.
  ['messaging', 'identity'],
  ['messaging', 'network'],
  ['messaging', 'anonymity'],
  ['messaging', 'monetization'],
  ['messaging', 'community'],
  // monetization must NEVER touch identity or messaging
  ['monetization', 'identity'],
  ['monetization', 'messaging'],
  ['monetization', 'network'],
  ['monetization', 'anonymity'],
  ['monetization', 'community'],
  // community must not touch identity, messaging, monetization
  ['community', 'identity'],
  ['community', 'messaging'],
  ['community', 'monetization'],
  // security must not import any feature module
  ['security', 'identity'],
  ['security', 'messaging'],
  ['security', 'network'],
  ['security', 'anonymity'],
  ['security', 'monetization'],
  ['security', 'community'],
];

async function readAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await readAllFiles(full)));
    } else if (entry.isFile() && full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('module isolation — forbidden imports', () => {
  for (const [importer, imported] of FORBIDDEN_PAIRS) {
    it(`${importer} must not import ${imported}`, async () => {
      const directory = ['identity', 'messaging'].includes(importer)
        ? join(__dirname, '../../../packages/reference-client/src/modules', importer)
        : join(MODULES_DIR, importer);
      const files = await readAllFiles(directory);
      const violations: string[] = [];
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const imports = preProcessFile(content, true, true).importedFiles;
        if (imports.some((entry) => entry.fileName.split('/').includes(imported))) {
          violations.push(file);
        }
      }
      expect(violations).toEqual([]);
    });
  }
});
