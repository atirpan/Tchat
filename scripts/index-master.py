"""Generate a conservative module inventory from the preserved v6.0 source."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
source = root / 'docs' / 'MASTER_v6_0.txt'
paragraphs = source.read_text(encoding='utf-8').splitlines()
modules = []
seen = set()
partial = {
    1: ['apps/api/test/client-boundary.spec.ts', 'docs/ADR_0001_CLIENT_BOUNDARY.md'],
    2: ['package.json', '.github/workflows/ci.yml'],
    3: ['crates/secure-memory/src/lib.rs', 'packages/security/src/secure-memory.ts', 'packages/security/src/secure-memory.spec.ts'],
    4: ['packages/security/src/redaction.ts', 'packages/security/src/redaction.spec.ts', 'docs/ADR_0003_REDACTION.md'],
    5: ['crates/policy/src/lib.rs'],
    6: ['crates/policy/src/lib.rs'],
    9: ['packages/reference-client/src/modules/identity/seed.service.ts'],
    10: ['packages/reference-client/src/modules/identity/derivation.service.ts'],
    17: ['crates/provider-contract/src/lib.rs', 'docs/ADR_0004_PROVIDER_CONTRACT.md'],
    14: ['crates/alias-policy/src/lib.rs', 'docs/ADR_0005_ALIAS_POLICY.md'],
    19: ['packages/reference-client/src/modules/messaging/message-derivation.service.ts'],
    23: ['packages/reference-client/src/modules/messaging/message-open.service.ts'],
    24: ['packages/reference-client/src/modules/messaging/session-store.service.ts'],
    27: ['crates/policy/src/lib.rs'],
    45: ['crates/secure-memory/src/lib.rs', 'packages/security/src/secure-memory.ts'],
    74: ['packages/reference-client/src/modules/messaging/messaging.service.spec.ts'],
    79: ['apps/api/test/forbidden-imports.spec.ts'],
}
for line_number, text in enumerate(paragraphs, 1):
    match = re.match(r'^MODÜL (\d+) — (.+)$', text)
    if not match or len(text) > 220:
        continue
    number = int(match.group(1))
    if number in seen:
        continue
    seen.add(number)
    status = 'REJECTED' if number in (64, 99) else 'PARTIAL' if number in partial else 'MISSING'
    modules.append({
        'id': number, 'title': match.group(2), 'status': status,
        'source_line': line_number,
        'evidence_paths': partial.get(number, []),
        'production_approved': False,
        'note': 'Test-only symmetric chain is not Double Ratchet.' if number == 19 else
                'No implementation claimed; requires detailed requirement and test mapping.',
    })
if seen != set(range(1, 109)):
    raise RuntimeError('Master inventory does not contain exactly modules 1 through 108')
for module in modules:
    for path in module['evidence_paths']:
        if not (root / path).is_file():
            raise RuntimeError('Missing evidence path: ' + path)
result = {
    'master_sha256': hashlib.sha256((root / 'docs/MASTER_v6_0.docx').read_bytes()).hexdigest(),
    'public_launch': 'BLOCKED',
    'scope': 'Module-level initial inventory, not full requirements verification.',
    'modules': modules,
}
(root / 'docs/module-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Indexed 108 modules; no production completion claims.')
