# Changelog

Board Vault follows semantic versioning for repository snapshots. The
application is still a private, invitation-only beta; a public Git repository
is not the same thing as a hosted product release.

## Unreleased

Changes after `0.1.0-beta.1` are recorded here until the next owner-approved
tag. Release notes must describe product boundaries honestly and must not
include credentials, personal data, provider identifiers, or private
operational details.

### Changed

- Sign-in is Clerk-only (ADR-0012). The legacy password, email-verification,
  and password-reset flows and their endpoints are removed, and migration 0015
  drops the credential columns.
- Local development signs in with `+clerk_test` fixture accounts through the
  development Clerk instance.
- Node.js 24 everywhere (`.nvmrc`, `engines`, CI, Vercel).
- Invitation and game-proposal creation are rate limited per account, and the
  API sees real client IPs behind Vercel.
- Swagger UI is served outside production only.
- Documentation rewritten around onboarding, maps, and how-to guides; work is
  tracked in GitHub Issues.
- Frontend unit tests run on Vitest (Karma and Jasmine removed) and now run in
  CI.
- Backend queries are split into per-domain classes
  (`databaseService.groups.getGroupById`, …).
- The backend deploys with Vercel's NestJS preset instead of the legacy
  `builds` configuration.

### Fixed

- Local checks on Windows: `.gitattributes` keeps LF line endings regardless
  of `core.autocrlf`, and backend e2e cleanup tolerates the SQLite file lock
  that the native libsql driver holds until the test process exits.

### Added

- Optional local Redis profile (`docker compose --profile redis up -d`).
- CI check for documentation links and Node version consistency.
- Clerk webhooks keep account emails in sync and soft-delete accounts whose
  Clerk user is deleted (ADR-0013).
- Rule-by-rule engineering-standards assessment in
  `docs/project-standards.yml`.

## 0.1.0-beta.1 — public development baseline

This is the first explicitly versioned public development baseline. It is not
a promise of production hosting, support, open registration, a complete game
catalogue, or a stable public API.

- Added the current group-centered information architecture and responsive
  navigation.
- Added explainable recommendation, acquisition, session, history, and
  group-person privacy boundaries.
- Added public contributor, design-system, release, and local synthetic-data
  guidance.
