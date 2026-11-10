# Run with Clerk

Local development always uses the **development** Clerk instance. Its keys
(`pk_test_…`, `sk_test_…`) go in `backend/.env`. Production keys never belong
on a development machine.

## Test accounts

`npm run local:setup` creates or reuses these users in the development
instance and links them to your local database:

| Email | Role in the sample data |
| --- | --- |
| `organizer+clerk_test@example.com` | Owns the sample group |
| `member+clerk_test@example.com` | Member of the sample group |

Sign in with the email, then the code `424242`. Clerk treats any address
containing `+clerk_test` as a test address: it sends no mail and always
accepts `424242`. To try a brand-new person, use any new
`something+clerk_test@example.com` address.

The shared development database has three more fixtures
(`dawichi+clerk_test@example.com`, `alex+clerk_test@example.com`,
`brr1+clerk_test@example.com`) linked the same way.

## Invitations

Group owners invite people by username only (#277): the invitee needs an
account first, and sees the invitation in their inbox in the app. Board Vault
sends no invitation email. To try a new person locally, sign up a
`+clerk_test` account (self-registration is on in `backend/.env.example`) and
invite it by its username.

## Webhooks don't reach your machine

Clerk sends its webhooks to an address on the internet, so a local API never
receives them. What that changes locally:

- **A username or email changed in Settings → Account → Manage sign-in**
  still lands: the app then calls `POST /auth/sync-from-clerk`, and the API
  reads the user from Clerk itself, as in production.
- **The same change made anywhere else** (the Clerk Dashboard, Clerk's
  Backend API, the `clerk` CLI) reaches your database only after you open
  Settings → Account while signed in as that user, which runs the same sync.
- **Deleting a user in Clerk** does not delete its local account. Delete
  accounts through Settings → Account instead (`DELETE /auth/account`).

To receive real deliveries, for example while working on the webhook
handler, expose the API with a tunnel (`ngrok http 3000`, or similar), add
`https://<tunnel>/webhooks/clerk` as an endpoint in the **development**
instance's Dashboard (*Webhooks*), and put its signing secret in
`CLERK_WEBHOOK_SIGNING_SECRET` in `backend/.env`. Remove the endpoint when
you finish: deliveries to a dead tunnel fail and are retried for days.

## Common problems

| Symptom | Cause |
| --- | --- |
| `409 ACCOUNT_EMAIL_CONFLICT` | Your Clerk user's email already belongs to an unlinked local account. Re-run `npm run local:setup`. |
| Signed in to Clerk but the app shows a connection error | The API is down, or the Clerk user is not linked and self-registration is off. |
| `401` on every request | The API has a different Clerk instance's secret key than the frontend's publishable key. |
| "Verify you are human" during browser tests | Clerk bot protection. Run the test through the Clerk testing fixture (`PLAYWRIGHT_CLERK_TESTING=1`). |

## Authenticated browser tests

Most signed-in Playwright journeys skip unless you give them saved Clerk
sessions ("storage states"). With the API and frontend running on port 4300
(`npm start -- --port 4300` in `frontend/`), and the Clerk keys loaded into your
shell from `backend/.env`:

```shell
cd frontend
mkdir -p /tmp/bv-states
PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_CLERK_TESTING=1 \
PLAYWRIGHT_SAVE_STORAGE_STATES_DIR=/tmp/bv-states \
  npx playwright test e2e/save-storage-states.spec.ts

PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_CLERK_TESTING=1 \
PLAYWRIGHT_AUTH_STORAGE_STATE=/tmp/bv-states/owner.json \
PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/bv-states/owner.json \
PLAYWRIGHT_MEMBER_STORAGE_STATE=/tmp/bv-states/member.json \
PLAYWRIGHT_GROUP_ID=1 \
  npx playwright test
```

Each spec's `test.skip` line lists any extra variables it needs (for example
the claim journey needs `PLAYWRIGHT_SINGLE_USER_GROUP_CLAIM=1`, an invitee
storage state and its username). Never commit storage-state files, and delete them when
you are done.

## Everyday-play browser regression

After local setup, `npm run seed:everyday-fixture` adds a second synthetic
local group, a person without an account, and a catalogue game nobody owns.
It only ever opens this checkout's `data/board-vault.local.db`; it ignores
remote database variables. The command prints the fixture group id.

With the local API/frontend running and owner storage state saved as above:

```shell
cd frontend
PLAYWRIGHT_BASE_URL=http://localhost:4300 \
PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/bv-states/owner.json \
PLAYWRIGHT_EVERYDAY_GROUP_ID=<printed-id> \
  npx playwright test e2e/everyday-play-flow.spec.ts --workers=1
```

The journey verifies multi-group cards, pin persistence, scoped retrospective
recording of an unowned catalogue game, repeated plays, corrections, and a
spontaneous live night at desktop and phone widths. Screenshots stay in the
ignored Playwright results directory. Run this only against disposable local
fixtures; it creates sessions.

## Resilience browser test

`frontend/e2e/resilience.spec.ts` (#248) checks that every signed-in page
survives the API failing. A helper (`e2e/fixtures/chaos-api.ts`) sends every
call to the API through `page.route` and answers it as `pass` (optionally
slowed), `down` (connection refused), `503` (the API's `DATABASE_TIMEOUT`
envelope), or `hang` (never answered), with per-path overrides. For each route
in `app.routes.ts` behind sign-in it cold-loads the page:

- **at boot** with the whole API down, 503 or hung: the handoff says Board
  Vault cannot be reached, with *Try again* and *Sign out*, never "could not
  finish setting up your sign-in";
- **after sign-in** with everything but the account check failing: once every
  call has failed or been given up on (about 25 s for a hang), the page is not
  blank, nothing still says it is loading, the connectivity banner shows,
  pages with their own data show their own alert with a retry button, and no
  empty state ("No game nights planned"…) pretends there is nothing;
- **slow** (300 ms on every call): the page loads without outage notices.

It also checks that *Retry* brings Home back once the API answers, and a
mid-session outage: Home loads, the API starts answering 503, and creating a
group shows the failure in the form and keeps the name. No call reaches the
API in the failure modes, so nothing is written.

With the API on the local fixtures (`npm run local:setup`), the frontend on
port 4300, and the owner storage state saved as above:

```shell
cd frontend
PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_CLERK_TESTING=1 \
PLAYWRIGHT_AUTH_STORAGE_STATE=/tmp/bv-states/owner.json \
  npx playwright test e2e/resilience.spec.ts --workers=4
```

It takes several minutes, mostly waiting out hung calls. The route ids default
to the local fixtures (group 1, session 1, game 1, member account 2, person 1);
`PLAYWRIGHT_GROUP_ID` and `PLAYWRIGHT_RESILIENCE_{SESSION,GAME,MEMBER_ACCOUNT,PERSON}_ID`
change them, and `PLAYWRIGHT_API_ORIGIN` the API address
(`http://localhost:3000`). In Git Bash on Windows, set `MSYS_NO_PATHCONV=1`
before filtering with `-g "/dashboard"`, or the route turns into a file path.

## Language switching

`frontend/e2e/locales/switch-signed-in.spec.ts` checks that choosing a
language in Settings saves it on the account, and that signing in on a fresh
browser opens the app in that language. `ng serve` serves one language, so it
runs against a development build with every language, served by
`scripts/serve-dist.mjs` with the build's own runtime config (your Clerk
development key). With the local API on port 3000:

```shell
cd frontend
npm run build -- --configuration=development --localize
set -a; source ../backend/.env; set +a
SERVE_DIST_RUNTIME_CONFIG=build PLAYWRIGHT_CLERK_TESTING=1 \
PLAYWRIGHT_LOCALES_SIGN_IN_EMAIL=organizer+clerk_test@example.com \
  npm run e2e:locales -- --workers=1
```

The site is served on `http://127.0.0.1:4400`, so the API needs
`CORS_ORIGINS=http://127.0.0.1:4400` and that origin in
`CLERK_AUTHORIZED_PARTIES`. The spec fails on any request to the production
API, which a production build (`npm run build` alone) would make. It sets the
account's language to Spanish and back to English.
