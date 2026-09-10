# Monetization module

Reference: MASTER_SYSTEM section 4 (Monetization), section 7.

## Responsibilities

- Anonymous revenue surface: token-based premium access, optional
  contributions, proof-of-work alternative.
- Token verification: "does this token unlock this feature, right now?".

## Allowed

- Issuing opaque, single-use or rate-limited tokens.
- Accepting anonymous donations (no receipt that carries identity).
- Exposing a pure boolean check `isFeatureUnlocked(token)` that takes ONLY a
  token, never an identity.

## Forbidden

- Payment linked to user identity (MASTER_SYSTEM 2.6, 7).
- Subscriptions linked to identity (MASTER_SYSTEM 7).
- Payment tracking, user-payment correlation (MASTER_SYSTEM 2.6, 7).
- Any "paid user" flag on any account-like record (MASTER_SYSTEM 2.6).
- Importing `IdentityModule` or `MessagingModule` (MASTER_SYSTEM 3.2).
- Calling third-party payment SDKs without an audit-approved integration
  (MASTER_SYSTEM 2.7).

## Dependencies

- `@anonym-messenger/security` (for token crypto — Phase 5).
- `@anonym-messenger/types` (for opaque token types).
- MUST NOT import from: `identity`, `messaging`, `network`, `anonymity`,
  `community`.

## Data Access Rules

- MUST NOT record who paid. Records are of the form `(tokenHash, grantedFeature, expiresAt)`.
- MUST NOT emit any event that can be correlated to an identity.
- Deletion of a token MUST be immediate and irrecoverable.

Phase 0: empty placeholder.
