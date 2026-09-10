# Expo Go test client

This is the mobile client shell for Expo SDK 57. It can be opened in Expo Go with:

```sh
cd apps/mobile
pnpm start
```

From the repository root the equivalent command is `pnpm mobile:start`.

The current screen intentionally exposes only local safety-state and exact-match alias validation. It does not send messages, persist secrets, or claim E2EE. Production messaging must be connected through the reviewed Rust provider contract and native secure-storage adapters before network features are enabled.

The app uses only `INTERNET` on Android. Contacts, location, notifications, analytics and device identifiers are not requested.
