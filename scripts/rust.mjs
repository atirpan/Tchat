/* eslint-env node */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const localCargo = join(root, '.tooling', 'cargo');
const executable = join(localCargo, 'bin', process.platform === 'win32' ? 'cargo.exe' : 'cargo');
const local = existsSync(executable);
const task = process.argv[2];
const argumentsByTask = {
  test: ['test', '--workspace', '--locked'],
  build: ['build', '--workspace', '--locked'],
  check: ['check', '--workspace', '--locked'],
  lint: ['clippy', '--workspace', '--all-targets', '--locked', '--', '-D', 'warnings'],
  format: ['fmt', '--all', '--', '--check'],
  'format-write': ['fmt', '--all'],
  lock: ['generate-lockfile'],
};
if (!Object.hasOwn(argumentsByTask, task)) throw new Error('Unsupported Rust task');
const env = { ...process.env };
if (local) {
  env.CARGO_HOME = localCargo;
  env.RUSTUP_HOME = join(root, '.tooling', 'rustup');
  if (process.platform === 'win32') {
    const channel = readFileSync(join(root, 'rust-toolchain.toml'), 'utf8').match(
      /channel\s*=\s*"([\d.]+)"/,
    )?.[1];
    if (!channel) throw new Error('Exact Rust toolchain version required');
    const tools = join(
      env.RUSTUP_HOME,
      'toolchains',
      `${channel}-x86_64-pc-windows-gnu`,
      'lib',
      'rustlib',
      'x86_64-pc-windows-gnu',
      'bin',
      'self-contained',
    );
    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    env[pathKey] = [
      join(root, '.tooling', 'mingw64', 'bin'),
      tools,
      join(localCargo, 'bin'),
      env[pathKey] ?? '',
    ].join(delimiter);
  }
}
const result = spawnSync(local ? executable : 'cargo', argumentsByTask[task], {
  cwd: root,
  env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
