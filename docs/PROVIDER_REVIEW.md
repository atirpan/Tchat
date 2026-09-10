# Production protocol provider review

Master v6.0 module 17 requires a license, API and security review before adding libsignal. No production messaging provider has been approved or added.

The official repository identifies libsignal as AGPL-3.0 and states that use outside Signal is unsupported and APIs/implementations may change without notice. Source: https://github.com/signalapp/libsignal (reviewed 2026-09-10).

The product is required to remain closed source. License compatibility must therefore be resolved before selecting this dependency; this is a selection gate, not a legal conclusion that every possible use is prohibited. No source code from libsignal has been copied into this project. No licensing agreement has been assumed.

Alternatives must meet the documented PQXDH, authentication, Double Ratchet, interoperability and independent-audit requirements. A new home-grown protocol is not an acceptable shortcut. Provider interfaces and explicit unavailable behavior may be developed while this gate is unresolved; they must not be marked as working E2EE.

Rust toolchain: a project-local GNU Windows toolchain is used for development because the machine has no MSVC installation. The official rustup Windows documentation permits basic GNU use without additional software: https://rust-lang.github.io/rustup/installation/windows.html . This development host choice does not change Android/iOS or production desktop platform requirements. External crates with native C dependencies may need additional tooling.
