# ADR 0003 — Fail-closed arbitrary-data redaction

## Decision

`redactObject` returns the fixed `[REDACTED]` token for every defined value without enumerating keys, traversing objects, invoking getters, calling `toJSON`, or inspecting proxies. `undefined` remains absent. The legacy sensitive-key set remains exported for compatibility and review, but it is not an allowlist.

## Rationale

Recursive redaction assumes that field names and object shape are trustworthy. They are not: an unknown field can contain plaintext, an identifier can create a correlation handle, and property access can execute attacker-controlled code. Fail-closed replacement removes those leak and side-effect paths. Structured operational diagnostics must use a separately typed fixed event schema.

## Evidence and limits

The adversarial test corpus covers unknown names, nested arrays, cycles, deep input, binary values, errors, getters, proxy traps and serialization hooks. This protects the generic boundary; it does not make arbitrary logging safe if callers bypass the boundary or if a future typed diagnostic schema includes identifying fields.
