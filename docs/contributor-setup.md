# Contributor setup

This guide is intentionally self-contained. It uses only repository files,
local SQLite databases, reserved-domain identities, and disposable provider
configuration. Do not use production accounts, shared development databases,
real email addresses, or private sibling repositories for local work.

## Requirements

- Node.js `22.20.0`, as declared in [`.nvmrc`](../.nvmrc);
- npm, installed with Node.js; and
- a Chromium installation for the frontend unit and browser checks.

Install both package trees from the repository root:

```shell
npm run install:all
```

## Local configuration

Copy the backend template into an ignored local file and fill it with
disposable values:

```shell
cp backend/.env.example backend/.env
```

For a local-only API, use a `file:` SQLite URL, an arbitrary development JWT
secret, a reserved sender address, and Redis disabled. Keep Clerk disabled
unless a disposable development tenant is explicitly being tested. The
frontend's runtime configuration is generated from public browser values when
`npm start` runs; never put a Clerk secret, database token, email key, or Redis
token in `frontend/`.

## Synthetic data and reset boundaries

The default unit and e2e fixtures use reserved identities such as
`organizer@example.test` and `member@example.test`. Database verification is
disposable and can be run from the root:

```shell
npm run verify:migrations
npm run verify:restore
npm run verify:rollback
```

These commands create temporary SQLite files, verify integrity and foreign
keys, rehearse migrations, and remove their temporary data. The fixture scripts
under [`database/scripts/`](../database/scripts/) reject production targets;
only use them against an explicit local `file:` database.

## Run and verify

Start the API and frontend in separate terminals using their package README
instructions. Before opening a pull request, run the relevant checks and use
the root commands when the change crosses package boundaries:

```shell
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Authenticated browser journeys require disposable local storage states and
explicit environment variables. If those values are absent, the tests skip
those journeys rather than contacting a real account or service.

## Product and privacy boundaries

Use the [product glossary](glossary.md) for copy and API terminology, and the
[design system](design-system.md) for shared UI language. Account
shelves are private; a shared shelf is group context; and a group person is a
group-scoped participant record, not an authentication account. Backend
authorization remains authoritative even when a route is hidden in the UI.
Report suspected vulnerabilities through [`SECURITY.md`](../SECURITY.md), not
through a public issue containing personal data or credentials.
