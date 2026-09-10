import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const task = process.argv[2];
if (!['build', 'dev', 'lint', 'test', 'typecheck'].includes(task)) {
  throw new Error('Unsupported workspace task');
}
const result = spawnSync(process.execPath, [require.resolve('turbo/bin/turbo'), 'run', task], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    TURBO_TELEMETRY_DISABLED: '1',
    DO_NOT_TRACK: '1',
  },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
