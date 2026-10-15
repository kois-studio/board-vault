# Recover production

What to check and do when production misbehaves. David owns production and is
the only escalation point; contributors report what they see in an issue.
Check the provider's status page before changing anything.

## Where it shows

- The uptime workflow opens an issue labelled `incident` while
  `/health/ready` fails ([environments.md](../environments.md#monitoring)).
- Error bodies and the `X-Request-Id` header carry a `requestId`. Search the
  Vercel logs for it.
- A `503` with `DATABASE_TIMEOUT` or `CLERK_TIMEOUT` means a provider took more
  than 5 seconds.

## Symptoms

| Symptom | Likely cause | Recovery |
| --- | --- | --- |
| `/health/ready` reports `database: down` | Turso outage, or an invalid `TURSO_AUTH_TOKEN` | Check Turso's status. If the token is invalid, create one (`turso db tokens create board-vault`), set it in Vercel, and [force a build](../environments.md#environments). |
| `/health/ready` reports `schema: down` | The code expects a different migration than production has | Apply the missing migration ([add-migration.md](add-migration.md#production-rollout-david-only)) or roll back the deploy. Between a migration and its deploy this is expected. |
| `cache: down`, but the site works | Upstash outage, or its token | The API keeps serving from Turso and rate limits fail open. Fix the token or wait. |
| Nobody can sign in; the public site loads | Clerk outage, or a wrong Clerk key in Vercel | Check Clerk's status, then compare the Vercel keys with the production instance. |
| A deploy broke the app | A bad release | Vercel **Instant Rollback** to the previous production deployment, then fix forward on `main`. |
| Data damaged by a migration or an operator mistake | — | Restore the dump taken before the change (`~/Documents/board-vault-backups/`). |
| Clerk webhook deliveries fail | `CLERK_WEBHOOK_SIGNING_SECRET` missing or rotated | The Clerk dashboard's Webhooks page shows failures and retries. Copy the endpoint's signing secret into Vercel and force a build. |
