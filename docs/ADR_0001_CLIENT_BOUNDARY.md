# ADR 0001 Separate test-only cryptography from server

Status: accepted within Master v6.0 sections 3, 4 and 4.1.

The original archive composed identity and messaging cryptography into the NestJS server application. Those modules accept seed, root material, shared secrets and plaintext. Keeping them in server source would conflict with the client-only secret boundary even while HTTP is disabled.

The unchanged module responsibilities and regression tests now live in packages/reference-client. This private reference package has no exports or production build command and is not a server/web dependency. NestJS annotations are retained solely for its legacy test harness. They do not constitute the production client architecture.

Benefits: previous behavioral work is preserved; server source does not include these providers; a boundary regression test rejects their reintroduction. This is a required intermediate migration, not a new product decision. Rust core and reviewed protocol integration remain missing and the launch gate remains blocked.

Migration: discard temporary reference sessions. Clean stale API build output before packaging; old compiled identity/messaging files must not be shipped. Rollback may restore legacy tests in an isolated reference branch, but must not restore secret-bearing server providers for production.
