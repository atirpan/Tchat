# Anonymity Notes (Phase 0)

## Principles (MASTER_SYSTEM §6)

- Every connection should be unlinkable.
- No consistent identifiers across sessions.
- Behavior must not be predictable.
- Communication patterns must be obscured.

## Phase 0 posture

Phase 0 has no runtime user surface. The following decisions are already
locked, so Phase 1 cannot accidentally regress them:

- No `users` table / collection exists, and no ORM is installed.
- No session store, no cookie strategy, no JWT helper is bundled.
- Shared `packages/types` currently defines no `User`, `Account`, or `Profile`
  type — future phases must derive identity from keys, not from records.
- ESLint forbids imports of tracking SDKs that would create cross-session
  identifiers.

## Forbidden patterns already surfaced (MASTER_SYSTEM §12)

- Email / phone login
- Global user search, contact discovery
- Online status, last seen, read receipts, typing indicators
- Persistent chat history
- Centralized identity mapping

These must never appear in `packages/types` or as API routes.
