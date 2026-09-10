# Test-only client behavior reference

This private package preserves the legacy identity and messaging code and its regression tests from the supplied archive. It is deliberately not exported, has no production build command and is not a dependency of the server or web application.

The custom HKDF chain is PROVISIONAL / TEST-ONLY. It must never be presented as audited Double Ratchet, PQXDH or production E2EE. The production client core must be implemented in Rust using reviewed standard protocol providers under Master v6.0 sections 3, 4 and 4.1.

This relocation preserves behavior and tests while removing secret-bearing providers from the NestJS server composition. It does not complete the Rust migration or public launch gate.
