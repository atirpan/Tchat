# ADR 0005 — Exact-match alias policy

`am-alias-policy` is a pure client-side validation contract. It accepts a bounded ASCII grammar, normalizes ASCII case, rejects Unicode until a reviewed confusable policy exists, reserves system names, and compares only the complete normalized alias. There is no prefix search, directory listing, autocomplete or root-identity lookup in this crate.

This is a policy foundation for module 14, not an alias registry. A production resolver must preserve the same exact-match and privacy properties, avoid persistent mapping to root identity, and pass independent review before being exposed to devices.
