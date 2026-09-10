# v6.0 implementation status

## Latest checkpoint — 2026-09-10 (supersedes older notes below)

Public launch remains BLOCKED. The project is incomplete.

- Secret-bearing identity/messaging code is now isolated in packages/reference-client, a private test-only package. Server boundary tests and compiled API output confirm removal from the server. See ADR_0001_CLIENT_BOUNDARY.md.
- Latest TypeScript results after the fail-closed redaction change: API 38, reference-client 50, security 28 and mobile policy 3 tests pass (119 total). Workspace test and typecheck tasks pass; Expo web export passes. Stub echo tasks in the historical config/types/utils/web packages are not tests.
- Sender state commits only after successful encryption and derivation. Receive authentication precedes replay/chain mutation. HKDF compatibility and transient-buffer cleanup tests pass. The custom reference chain is not production Double Ratchet.
- Rust client policy foundation has five passing tests, including exhaustive capability combinations; its clippy check passes. Flags are not independent security evidence.
- Rust provider contract now defines explicit pairwise/group/file/manual-lock algorithm IDs and fail-closed negotiation with downgrade rejection. Four contract tests pass; it contains no cryptography and does not select a production provider. See ADR_0004_PROVIDER_CONTRACT.md.
- Rust alias policy now provides bounded ASCII normalization, reserved-name rejection and exact-match-only resolution. Four tests pass; it is not a registry and does not map an alias to root identity. See ADR_0005_ALIAS_POLICY.md.
- An Expo SDK 57 mobile test client now exists under apps/mobile. Its app configuration resolves for Android, iOS and web, and its TypeScript check passes. It currently provides local safety-state and exact-match alias UI only; it intentionally has no network messaging, secret persistence or production E2EE claim.
- Expo web export completed successfully after adding `react-native-web`; `pnpm mobile:start` is the root convenience command for opening the client in Expo Go. This is a device-testable UI shell, not yet the finished messenger requested by v6.0.
- Figma file `anonim messenger` (frame `onboarding-welcome`, 402×874) is now reflected in the Expo screen: dark/light theme switch, charcoal/cyan palette, lock mark, slogan, CTA hierarchy, monospace security labels and local-status panel. The remaining Figma frames are still to be wired into navigation and native capabilities.
- Rust secure-memory code with zeroize/getrandom, destruction, access-time expiry and rollback rejection passes five unit tests and one compile-fail doctest. Together with policy, ten Rust unit tests pass; Rust clippy and format checks pass. Local Windows import-library generation was repaired with hash-verified MSYS2 development tools kept under ignored .tooling.
- module-inventory.json maps all 108 module headings; no module is production-approved. Modules 64/99 remain rejected. launch:check fails closed; independent release-evidence verification is still unimplemented.
- Node 24.19.0/pnpm 11.19.0 and Rust 1.98.1 are pinned. See ADR_0002_BUILD_TOOLCHAIN.md. CI is configured but remote execution is not verified.

Provisional comparison decisions: reference ciphertext is bounded at 1 MiB and reference session TTL at 24 hours to bound allocation/lifetime inputs. These are not final production media/session policies. Strict sequential reference reception follows section 4.1. Moving secret modules out of the API aligns with the client-only requirement. Changing the ZIP's Node 20/pnpm 9 toolchain matches the verified installed runtime and lockfile. Hardware memory protection, native clients, reviewed protocols, encrypted persistence, real transports, device tests and independent audit remain outstanding.

Next: update module evidence; continue requirement mapping and client implementation. No cryptographic provider is production-approved; see PROVIDER_REVIEW.md and RUST_DEPENDENCIES.md. Original ZIP and Word document are unchanged. The older checkpoint below is retained as history and must not be used as current status.

## Historical checkpoint

The supplied MASTER_v6_0.docx is preserved unchanged. MASTER_v6_0.txt is its extracted paragraph text for searching. Legacy documents describe historical decisions and do not override v6.0.

Public launch: BLOCKED. This repository is not a production messenger.

## Current work

Phase 2.6 receive transaction safety: initial regression verification passed on 2026-09-10. API Jest: 11 suites, 86 tests passed. Full Phase 2.6 gate is still open; this is not production approval.
The reference receiver now preflights counters without mutation and commits the receive chain and replay state only after successful AEAD authentication. Authenticated invalid application payloads consume a step; unauthenticated packets do not.

Out-of-order acceptance is disabled in the test-only custom protocol as required by section 4.1. Standard protocol integration must provide production skipped-message support. Existing sessions must be discarded during migration; no persistent history exists to migrate. Rolling back to the vulnerable receiver is not a safe production rollback.

The custom HKDF chain is PROVISIONAL / TEST-ONLY. It is not an approved Double Ratchet or production E2EE implementation. The NestJS module placement remains a CONFLICT until secret-bearing reference modules are isolated from the server application and the client Rust boundary is implemented.

## Completion evidence still required

- All 108 module specifications must be mapped to code, tests and explicit status, including rejected modules 64 and 99.
- Rust client core, Android and iOS clients and transport implementations are missing.
- Standard protocol interoperability and independent cryptography/security review are missing.
- Three physical phone tests, traffic-correlation simulations and economic launch gates are missing.
- No launch-required capability may be marked complete based on an interface, mock or this document alone.

## Comparison with supplied specification

No intentional product decision deviation has been adopted. Strict sequential reference reception follows section 4.1 and prevents invalid skipped-key behavior. The temporary receive allocation ceiling is 1 MiB, a provisional test implementation limit supporting section 4.1; it does not freeze the production wire format or replace the media module's chunking policy.

## Resume notes

Continuation verification: API suite now has 87 passing tests; security suite has 31 passing tests across two suites. API TypeScript noEmit passes. Targeted ESLint passes for message-open, message-seal, secure-memory and aead. Full repository build/lint is still unverified. Receive commit failures now clear the authenticated plaintext and uncommitted next key. Invalid send input (oversized body/content type, invalid timestamp) is rejected before counter consumption, with regression coverage. SecureMemory now lends a synchronous temporary copy and wipes it in finally on success/error; tests verify retained-view clearing and preserved owner bytes. This fixes the previous mismatch between documented and implemented lifetime. Caller-created copies and asynchronous callback use cannot be guaranteed secure in JavaScript; production Rust boundary remains required.

Source imported into workspace from original ZIP; original ZIP unchanged. pnpm install now succeeds using bundled pnpm 11.19.0, but root packageManager declares pnpm 9.12.0: align toolchain and lockfile deliberately before claiming reproducible CI. Fixed missing types dependencies in utils/security and TypeScript errors in HKDF, AEAD types and clock scanner. AEAD temporary plaintext buffers are cleared on success/failure. Receiver enforces derived nonce and bounded ciphertext/counters/session-id syntax. Regression covers 32 rounds of malformed packets followed by authentic messages and retransmitted sequential packets.

Next: run security package tests, lint/format/typecheck/build; fix remaining baseline configuration errors; complete transactional error/expiry handling, parser/property tests and sender failure-state behavior. Isolate reference identity/messaging from server runtime, build all-module traceability from preserved master, then implement Rust client architecture under the standard protocol gate. Rust/cargo were not found on PATH. Do not skip independent audit or physical-device requirements.

An active thread heartbeat named Anonim Messenger geliştirmeye devam retries continuation every 30 minutes. It may resume after natural quota renewal; it must not redeem reset credits or purchase usage. Respect runtime permission limits. User requested no repeated approval questions.
