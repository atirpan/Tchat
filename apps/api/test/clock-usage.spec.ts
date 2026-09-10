import { promises as fs, type Dirent } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Clock usage guardrail.
 *
 * MASTER_SYSTEM 6 requires that behaviour is not predictable. Uncontrolled
 * wall-clock reads leak a behavioural fingerprint and produce flaky tests.
 * All time-dependent code MUST receive a `Clock` from `@anonym-messenger/utils`.
 *
 * This guardrail statically scans the repository and fails the build if any
 * source file uses `Date.now()` or `new Date()` outside of the sanctioned
 * locations (the `Clock` implementation itself and test files).
 *
 * Complements — but does not replace — the ESLint `no-restricted-syntax`
 * rules in the repo root.
 */

const REPO_ROOT = join(__dirname, '..', '..', '..');

const SCAN_DIRS = ['apps/api/src', 'apps/web/src', 'packages'];

// Relative paths (from REPO_ROOT) where raw clock access is sanctioned.
// Kept deliberately small and audit-reviewed.
const ALLOWLIST: ReadonlyArray<string> = [
  // The ONE sanctioned Clock implementation surface.
  'packages/utils/src/index.ts',
];

const FORBIDDEN_PATTERNS: ReadonlyArray<{ name: string; regex: RegExp }> = [
  { name: 'Date.now()', regex: /\bDate\s*\.\s*now\s*\(/ },
  { name: 'new Date() (unparameterized)', regex: /\bnew\s+Date\s*\(\s*\)/ },
  { name: 'performance.now()', regex: /\bperformance\s*\.\s*now\s*\(/ },
];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') {
        continue;
      }
      out.push(...(await walk(full)));
    } else if (entry.isFile()) {
      if (
        full.endsWith('.ts') ||
        full.endsWith('.tsx') ||
        full.endsWith('.mjs') ||
        full.endsWith('.js')
      ) {
        // Skip test files — tests are allowed to freeze time explicitly.
        if (/\.(spec|test)\.(ts|tsx|js)$/.test(full)) continue;
        out.push(full);
      }
    }
  }
  return out;
}

describe('clock usage guardrail', () => {
  it('rejects raw Date.now / new Date / performance.now outside the allowlist', async () => {
    const files: string[] = [];
    for (const dir of SCAN_DIRS) {
      files.push(...(await walk(join(REPO_ROOT, dir))));
    }

    const violations: Array<{ file: string; pattern: string }> = [];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
      if (ALLOWLIST.includes(rel)) continue;
      const content = await fs.readFile(file, 'utf8');
      for (const { name, regex } of FORBIDDEN_PATTERNS) {
        if (regex.test(content)) {
          violations.push({ file: rel, pattern: name });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
