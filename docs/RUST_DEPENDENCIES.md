# Initial Rust security dependencies

Reviewed before addition on 2026-09-10. These are low-level building blocks, not a production messaging protocol approval.

| Dependency | Exact version | Role | License | Limits and review status |
| --- | --- | --- | --- | --- |
| zeroize | 1.9.0 | Compiler-resistant secret-buffer clearing | MIT OR Apache-2.0 | RustCrypto maintained; optional derive/serde features not enabled. Does not provide mlock, hardware-backed keys or elimination of all stack/register copies. |
| getrandom | 0.4.3 | Operating-system cryptographic randomness | MIT OR Apache-2.0 | rust-random maintained; default platform backend only, no custom or weak fallback. OS failure is returned as an error. |

Sources: https://docs.rs/zeroize/1.9.0/zeroize/ ; https://docs.rs/getrandom/0.4.3/getrandom/ ; https://github.com/rust-random/getrandom . No network or telemetry functionality is requested by the core API. Platform-specific transitive dependencies must be retained in Cargo.lock and reviewed by dependency scanning. Independent security review, advisory scanning and device-level evidence remain outstanding. License notices must be included in eventual distributions.
