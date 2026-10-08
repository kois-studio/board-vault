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

Group owners invite new people by email. The invite link lands on
`/register?__clerk_ticket=…`, where the invitee picks a username and password.
Locally, the link points at `BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL`
(default `http://localhost:4200/register`). Use `+clerk_test` addresses so no
real mail is sent.

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
the invitation journey needs `PLAYWRIGHT_NEW_PERSON_INVITATION=1` and a new
`+clerk_test` invitee). Never commit storage-state files, and delete them when
you are done.
