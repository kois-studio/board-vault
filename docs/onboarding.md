# Onboarding

From a clean clone to a running app signed in as a test account, in about ten
minutes. The steps are the same on macOS, Windows, and Linux.

## 1. Install the tools

- **Node.js 24** (the exact version is in [`.nvmrc`](../.nvmrc)). With
  [nvm](https://github.com/nvm-sh/nvm), run `nvm install` then `nvm use` from
  the repository root. [nvm-windows](https://github.com/coreybutler/nvm-windows)
  does not read `.nvmrc`, so pass the version from that file:
  `nvm install 24.15.0` then `nvm use 24.15.0`.
- **npm** comes with Node. The project uses npm and its lockfiles; don't use
  pnpm or yarn.
- **Git** and a Chromium browser (Chrome or Edge) for tests.
- The **`sqlite3` command-line tool** for the backend e2e tests and the
  `verify:*` database checks. macOS ships it; on Debian/Ubuntu install
  `sqlite3`; on Windows run `winget install SQLite.SQLite` and open a new
  terminal.

## 2. Get the development keys

Sign-in is Clerk-only, so you need the **development** Clerk keys
(`pk_test_…` and `sk_test_…`). Ask David; he sends them privately (Bitwarden
Send). Never paste them into an issue, PR, or chat.

## 3. Install and configure

```shell
git clone https://github.com/kois-studio/board-vault.git
cd board-vault
npm run install:all
cp backend/.env.example backend/.env
```

On Windows PowerShell, use `Copy-Item backend/.env.example backend/.env`.

Open `backend/.env` and fill in `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
Leave everything else as it is. On macOS or Linux, run `chmod 600 backend/.env`.

## 4. Create your local database

```shell
npm run local:setup
```

This creates `data/board-vault.local.db` inside your checkout with sample
games, a group, and sessions. It also creates or reuses two test users in the
development Clerk instance. Run it again at any time to start over; it only
touches your own local file.

## 5. Run the app

In two terminals:

```shell
cd backend
npm run dev
```

```shell
cd frontend
npm start
```

Open <http://localhost:4200>, choose **Log In**, and sign in with:

| Account | Email | Code |
| --- | --- | --- |
| Group organizer | `organizer+clerk_test@example.com` | `424242` |
| Group member | `member+clerk_test@example.com` | `424242` |

Clerk never sends real mail to `+clerk_test` addresses; the code is always
`424242`. More in [how-to/run-with-clerk.md](how-to/run-with-clerk.md).

The API also serves interactive docs at <http://localhost:3000/swagger>.

## 6. Check your setup

```shell
npm run lint
npm run test:unit
npm run build
```

If these pass, your machine is ready.

## Your first change

1. Pick an issue from [GitHub Issues](https://github.com/kois-studio/board-vault/issues)
   (`good first issue` is a good start) and say in a comment that you're on it.
2. Create a branch: `git switch -c fix/short-description`.
3. Read the matching guide in [AGENTS.md](AGENTS.md#routing-doing-x-read-y).
4. Make the change with tests, then run the checks for the packages you touched.
5. Push and open a PR to `main` that says `Closes #<issue>`. CI runs four jobs,
   and David reviews.

Working on two things at once? Use a separate worktree so each has its own
`backend/.env` and database:

```shell
git worktree add ../board-vault-feature -b feature/name
cd ../board-vault-feature
npm run install:all
cp ../board-vault/backend/.env backend/.env
npm run local:setup
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Backend exits with `Missing in .env file: CLERK_SECRET_KEY` | Fill in the Clerk keys in `backend/.env`. |
| Login page says sign-in is not configured | `CLERK_PUBLISHABLE_KEY` is empty. Set it and restart `npm start`. |
| Signed in but "We could not finish connecting this sign-in" | The backend is not running, or your local database was created without the Clerk key. Re-run `npm run local:setup`. |
| `npm ci` fails with a lockfile error | Check `node --version` is 24.x. |
| `npm start` exits with `EADDRINUSE` or another app opens on port 4200 | Something else uses port 4200. Run `npm start -- --port 4300` and open <http://localhost:4300>. For invitation links, also set `BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL=http://localhost:4300/register` in `backend/.env`. |
| Screenshot tests are skipped on macOS or Windows | Expected. They only run on Linux; see [how-to/update-screenshots.md](how-to/update-screenshots.md). |
| Something else | Open a bug report issue with the steps and the error text. |
