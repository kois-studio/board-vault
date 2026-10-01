# Environments

Every environment and every variable in one place. This page lists names and
where they are set, never values.

## Environments

| Environment | Frontend | API | Database | Clerk | Redis | Who can change it |
| --- | --- | --- | --- | --- | --- | --- |
| Local | `localhost:4200` (`npm start`) | `localhost:3000` (`npm run dev`) | Your own SQLite file, `data/board-vault.local.db` | Development instance | Off (optional [local profile](how-to/run-with-redis.md)) | You |
| Shared development | Local | Local | Turso `board-vault-development` | Development instance | Off | David (reset/refresh is an owner operation) |
| CI | Built in GitHub Actions | Built in GitHub Actions | Temporary SQLite files | Placeholder key, never contacted | Off | Pull requests |
| Production | `board-vault.com` (Vercel `board-vault-front`) | `backend.board-vault.com` (Vercel `board-vault-back`) | Turso `board-vault` | Production instance | Upstash | David |

Vercel builds only from `main` and only when non-documentation files changed,
so documentation-only pushes do not deploy. Pull request previews are not
deployed. The backend project has placeholder Preview variables (an
unreachable database URL, a dummy Clerk key, Redis off), not secrets, so an
owner-forced preview can boot and answer `/health`; `/health/ready` stays not
ready there. The backend project has placeholder Preview variables (an unreachable
database URL, a dummy Clerk key, Redis off), not secrets, so an owner-forced
preview can boot and answer `/health`; `/health/ready` stays not ready there.

## Backend variables

Set locally in `backend/.env` (start from
[`backend/.env.example`](../backend/.env.example)). Set in production in the
Vercel `board-vault-back` project. [`validateEnv.ts`](../backend/src/common/validators/validateEnv.ts)
checks them at startup.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | No | `production` switches CORS to the production origin, hides Swagger, and makes the production checks below required. Vercel sets it. |
| `PORT` | No | API port, default `3000`. |
| `TURSO_DATABASE_URL` | Yes | `file:…` for local SQLite, `libsql://…` for Turso. |
| `TURSO_AUTH_TOKEN` | For `libsql://` URLs | Turso database token. Ignored for `file:` URLs. |
| `CLERK_SECRET_KEY` | Yes | Verifies Clerk session tokens and calls the Clerk API. `sk_test_…` everywhere except production. |
| `CLERK_PUBLISHABLE_KEY` | Locally | Not read by the API. The frontend startup script reads it from `backend/.env`. |
| `CLERK_AUTHORIZED_PARTIES` | Production | Comma-separated origins allowed to present session tokens. |
| `BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL` | Production | Where Clerk invitation links land (`…/register`). |
| `CLERK_WEBHOOK_SIGNING_SECRET` | No | Signing secret (`whsec_…`) of the Clerk webhook endpoint. Turns on `POST /webhooks/clerk` ([ADR-0013](adr/0013-clerk-user-lifecycle.md)); unset, the endpoint answers `404`. |
| `BOARD_VAULT_SELF_REGISTRATION_ENABLED` | No | `true` lets a Clerk user without an invitation create an account. Keep `false` in production during the private beta; the API logs a warning at startup if it is `true`. |
| `BOARD_VAULT_GROUP_PEOPLE_ENABLED` | No | `false` turns off the group-people routes without touching data. |
| `UPSTASH_REDIS_REST_DISABLE` | No | `true` turns off caching and rate-limit storage. Rate limits then fail open. |
| `UPSTASH_REDIS_REST_URL` | When Redis is on | Upstash REST endpoint. |
| `UPSTASH_REDIS_REST_TOKEN` | When Redis is on | Upstash REST token. |
| `CORS_ORIGINS` | No | Extra comma-separated browser origins. Local defaults already allow ports 4200 and 4300. |

Vercel also sets `VERCEL` and `VERCEL_ENV`. The API uses them to trust the
Vercel proxy hop (real client IPs for rate limits) and to hide Swagger.

## Frontend configuration

The frontend has no `.env` file. `npm start` and `npm run build` run
[`scripts/generate-runtime-config.mjs`](../frontend/scripts/generate-runtime-config.mjs),
which writes the ignored `frontend/public/runtime-config.js` from:

| Variable | Source locally | Source in production |
| --- | --- | --- |
| `CLERK_PUBLISHABLE_KEY` | `backend/.env` | Vercel `board-vault-front` |
| `BOARD_VAULT_SELF_REGISTRATION_ENABLED` | `backend/.env` | Not set, so `false` |

Only public values may go there. The API base URL is fixed per build in
[`src/environments/`](../frontend/src/environments/).

## Secrets handling

- The development `backend/.env` is shared privately by David (Bitwarden Send).
  It contains only development keys.
- Production values live in Vercel and in David's password manager. Nobody
  else needs them for development.
- If a secret lands in Git, an issue, a PR, or a chat, tell David so it can be
  rotated.

## Monitoring

- **Uptime:** the [`uptime.yml`](../.github/workflows/uptime.yml) workflow
  checks `https://backend.board-vault.com/health/ready` every 15 minutes
  (three tries). While it fails, one issue labelled `incident` stays open and
  is assigned to David; the first healthy check closes it. To test the alert,
  run the workflow manually with a bad URL.
- **Logs:** on Vercel the API writes one JSON object per line. Every line
  inside a request has its `requestId` (also returned as `X-Request-Id` and in
  error bodies); `http.request.completed` adds the route template, status,
  duration, and account id; `provider.timeout` marks a slow provider. Search
  Vercel logs by any of these values. No bodies, emails, or tokens are logged.
