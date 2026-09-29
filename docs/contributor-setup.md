# Contributor setup

This guide is intentionally self-contained. Routine development uses only
repository files, a per-checkout SQLite database, reserved-domain identities,
and disposable provider configuration. Do not use production accounts,
shared development databases, real email addresses, or private sibling
repositories for local work.

## Requirements

- Node.js `22.20.0`, as declared in [`.nvmrc`](../.nvmrc);
- npm, installed with Node.js; and
- a Chromium installation for the frontend unit and browser checks.

Install both package trees from the repository root:

```shell
npm run install:all
```

The project uses npm with separate backend and frontend lockfiles. Do not use
pnpm or install dependencies only at the repository root.

## Local configuration

Copy the backend template into an ignored local file:

```shell
cp backend/.env.example backend/.env
chmod 600 backend/.env
```

The template uses a local `file:` SQLite URL, a local-only JWT secret, a fake
email key that cannot send mail, and Redis disabled. It requires no hosted
database or provider credentials. Keep `backend/.env` private and never replace
its local values with production credentials.

The frontend has no `.env` file. Its startup script generates ignored
`frontend/public/runtime-config.js` from public browser configuration. Without
a Clerk publishable key, the frontend uses the compatibility login against
the local fixtures. Never put a Clerk secret, database token, email key, or
Redis token in frontend configuration.

## Synthetic data and reset boundaries

Create or recreate the local database at any time with:

```shell
npm run local:reset
```

`npm run local:setup` is an alias for the same clean setup. The reset is
hard-coded to `data/board-vault.local.db` under this checkout, refuses an
unexpected file type, applies the schema baseline and all migrations, and
seeds synthetic data. It cannot target Turso or another remote database.

The local login fixtures are:

| Email | Password |
| --- | --- |
| `organizer@example.test` | `local-only-board-vault` |
| `member@example.test` | `local-only-board-vault` |

These credentials are synthetic and local-only. The seed includes a small game
catalog, a two-member group, ownership and review data, and completed and
scheduled sessions. Each Git worktree gets its own ignored `data/` directory.

Database verification is disposable and can be run from the root:

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

Start the API and frontend in separate terminals from the repository root:

```shell
cd backend && npm run dev
```

```shell
cd frontend && npm start -- --port 4300
```

The local backend allows the frontend at `http://localhost:4300`. Before
opening a pull request, run the relevant checks and use the root commands when
the change crosses package boundaries:

```shell
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Authenticated browser journeys require disposable local storage states and
explicit environment variables. If those values are absent, the tests skip
those journeys rather than contacting a real account or service.

## Optional shared integration environment

Use the shared development Clerk instance and `board-vault-development` Turso
database only for work that specifically needs provider or multi-user
integration. These services are shared. Normal local reset never touches them.
Get current development-only credentials from the repository owner through an
approved private channel. Save the supplied environment file as
`backend/.env` and restrict it to your account:

```shell
chmod 600 backend/.env
```

The backend reads that file for its development Clerk and Turso settings. The
frontend startup/build script also reads it to create the ignored
`frontend/public/runtime-config.js`; it writes only the Clerk publishable key
and public feature flags there, never the Clerk secret or Turso token. Restart
the frontend after changing the file. Do not commit or copy the file into a PR.
Production Clerk, Turso, Resend, Redis, and deployment credentials are not
needed for contribution work.

Do not reset or refresh the shared Turso database as part of ordinary feature
development. Its reset/refresh is an owner-run operation because it destroys
other contributors' integration state and may read approved reference data
from production. Coordinate a reset explicitly and follow the private
operator procedure.

## Parallel contribution workflow

Use one focused branch or Git worktree per task. A separate worktree keeps
working files, local `.env`, and the disposable database isolated while
contributors work concurrently. Example:

```shell
git fetch origin
git worktree add ../board-vault-sessions -b feature/sessions origin/main
cd ../board-vault-sessions
npm run install:all
cp backend/.env.example backend/.env
npm run local:setup
```

Open a PR against `main` when the task is ready. GitHub requires one approval
and the four CI checks. Avoid overlapping edits to the generated OpenAPI
snapshot; regenerate it after API source changes and resolve any concurrent
snapshot updates against the latest `main`. Coordinate migration file numbers
before adding migrations, and keep schema changes additive. For a task that
crosses frontend and backend boundaries, agree the DTO/behavior contract in
the issue or PR description before implementing both sides.

## Product and privacy boundaries

Use the [product glossary](glossary.md) for copy and API terminology, and the
[design system](design-system.md) for shared UI language. Account
shelves are private; a shared shelf is group context; and a group person is a
group-scoped participant record, not an authentication account. Backend
authorization remains authoritative even when a route is hidden in the UI.
Report suspected vulnerabilities through [`SECURITY.md`](../SECURITY.md), not
through a public issue containing personal data or credentials.
