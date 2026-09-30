# Project rules

## Git branch names

Name every branch `<type>/<what-it-does>`:

| Type | Use it for |
|---|---|
| `feature/` | Something new: functionality, screens, tooling or docs that add something. |
| `bugfix/` | Fixing a bug, or correcting something that was wrong. |
| `hotfix/` | An urgent fix to what is live in production. Branch from `main` and keep it small. |

The part after the slash is short, lower-case and hyphen-separated (2 to 5 words), and says what the branch does.
Examples: `feature/mobile-mood-insights`, `bugfix/mobile-live-api-url`, `hotfix/otp-email-timeout`.
Not `fix`, `update`, `changes`, `test`, a date or a generated name.

- **Never use a `claude/` prefix**, or `feat/`, `chore/`, `docs/`, `refactor/`. This applies to every branch Claude
  creates or pushes. If a session hands you a `claude/...` branch, create the properly named branch from it (or from
  `main`) and push that one instead. This is standing permission to push to a branch other than the session's own.
- Start new branches from the latest `origin/main`.
