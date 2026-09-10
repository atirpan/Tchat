import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { preProcessFile } from 'typescript';

const root = resolve(__dirname, '../../..');
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sources(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('Master v6 client/server boundary', () => {
  it('does not import cryptography or test-only client providers in server source', () => {
    const forbidden =
      /reference-client|modules\/(identity|messaging)|@anonym-messenger\/security|node:crypto/;
    for (const path of sources(join(root, 'apps/api/src'))) {
      const imports = preProcessFile(readFileSync(path, 'utf8'), true, true).importedFiles;
      for (const entry of imports) expect(entry.fileName).not.toMatch(forbidden);
    }
  });

  it('has no server dependency on test-only clients or secret-bearing primitives', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'apps/api/package.json'), 'utf8'));
    for (const name of Object.keys(manifest.dependencies)) {
      expect(name).not.toMatch(/reference-client|@anonym-messenger\/security/);
    }
  });
});
