# Module Placeholders

Each backend module lives in `apps/api/src/modules/<name>` and is currently
an empty NestJS module with only a `README.md` describing its future purpose
and forbidden patterns (from MASTER_SYSTEM §4).

| Module        | Purpose                                  | Forbidden (summary)                         |
| ------------- | ---------------------------------------- | ------------------------------------------- |
| identity      | anonymous account / key derivation       | personal data, global identity              |
| messaging     | secure communication, lifecycle          | plaintext storage, permanent history        |
| network       | anonymized transfer, obfuscation         | IP tracking, traceable routing              |
| security      | global protection layer                  | (acts as layer, not feature module)         |
| anonymity     | prevent behavioral tracking              | consistent identifiers                      |
| monetization  | anonymous revenue (token-based)          | account-linked payments                     |
| community     | spam / abuse resistance                  | persistent reputation tracking              |

The `UI` module from MASTER_SYSTEM §3 lives in `apps/web` rather than as a
backend module.
