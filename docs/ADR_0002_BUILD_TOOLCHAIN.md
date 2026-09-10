# ADR 0002 Pin the verified development toolchain

The archive declared Node 20 and pnpm 9.12.0 without a lockfile. The supplied local runtime actually uses Node 24.19.0 and pnpm 11.19.0. Tests and builds have been run with these versions. The installed pnpm manifest requires Node >=22.13.

Root engines, packageManager, .nvmrc and CI are aligned to the locally verified exact versions. pnpm-lock.yaml records resolved dependencies; install scripts for @nestjs/core and unrs-resolver are explicitly disabled, and existing tests/builds have succeeded without them. This does not claim a clean dependency vulnerability scan: that remains an outstanding gate.

This is a tooling change from the ZIP, not a change to the v6.0 Rust/native architecture. Its benefit is removing local-versus-CI version drift. Rollback requires reverting both manifests and lockfile as one tested change, not independently downgrading the package manager.

Rust 1.98.1 is pinned from the official stable toolchain metadata returned during installation. The Windows development toolchain is local to .tooling and does not modify the machine PATH. The CI runner uses rustup and the same rust-toolchain.toml. Rust dependencies have not been added to the initial policy crate.
