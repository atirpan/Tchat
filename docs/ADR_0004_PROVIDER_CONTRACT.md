# ADR 0004 — Explicit crypto-provider contract

The Rust `am-provider-contract` crate defines the client boundary for pairwise, group, file and manual-lock providers. It contains no cryptography and cannot authorize a provider on its own.

Every algorithm is identified by family and version. Negotiation accepts only the caller's exact requested ID when both the peer offer and signed/local policy allow it. A higher or lower peer version is never selected automatically. This provides downgrade resistance and leaves the production choice open until PQXDH/Double Ratchet and MLS providers pass licensing, interoperability and independent review.

The crate is therefore a contract foundation, not an E2EE implementation. Native Android, iOS and desktop adapters must keep key material and plaintext behind an opaque provider session and must refuse messaging when no reviewed provider is available.
