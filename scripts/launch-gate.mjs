import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const inventory = JSON.parse(readFileSync(join(root, 'docs/module-inventory.json'), 'utf8'));
const actualHash = createHash('sha256').update(readFileSync(join(root, 'docs/MASTER_v6_0.docx'))).digest('hex');
const reasons = [];
if (inventory.master_sha256 !== actualHash) reasons.push('Master document hash mismatch');
const ids = new Set(inventory.modules.map((module) => module.id));
if (ids.size !== 108 || inventory.modules.length !== 108 || [...ids].some((id) => !Number.isInteger(id) || id < 1 || id > 108)) {
  reasons.push('Incomplete or duplicate module inventory');
}
for (const module of inventory.modules) {
  if ([64, 99].includes(module.id)) {
    if (module.status !== 'REJECTED') reasons.push(`Rejected marketplace module ${module.id} was re-enabled`);
    continue;
  }
  if (module.status !== 'IMPLEMENTED' || module.production_approved !== true) {
    reasons.push(`Module ${module.id}: ${module.status}; no production acceptance evidence`);
  }
}
// An initial module inventory cannot authorize production; an independently
// reviewed release evidence manifest must be designed before this gate can pass.
reasons.push('Independent release evidence verifier has not been implemented');
process.stderr.write(`PUBLIC LAUNCH BLOCKED\n${reasons.join('\n')}\n`);
process.exitCode = 1;
