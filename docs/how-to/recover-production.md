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
| `cache: down`, but the site works | Upstash outage, or its token | The API keeps serving from Turso and rate limits fail open. `cache.request.failed` lines in the logs give the error (`TimeoutError`: Redis took longer than 250 ms). Fix the token or wait. |
| Nobody can sign in; the public site loads | Clerk outage, or a wrong Clerk key in Vercel | Check Clerk's status, then compare the Vercel keys with the production instance. |
| A deploy broke the app | A bad release | Vercel **Instant Rollback** to the previous production deployment, then fix forward on `main`. |
| Data damaged by a migration or an operator mistake | — | Within 24 hours: [point-in-time restore](#point-in-time-restore). Later: restore the dump taken before the change (`~/Documents/board-vault-backups/`). |
| Clerk webhook deliveries fail | `CLERK_WEBHOOK_SIGNING_SECRET` missing or rotated | The Clerk dashboard's Webhooks page shows failures and retries. Copy the endpoint's signing secret into Vercel and force a build. |

## Point-in-time restore

Turso keeps about **24 hours** of history for production on the free Starter
plan (#138, confirmed on 2026-11-17: copies from 1, 20 and 23½ hours back
worked, from 25 hours back Turso answered "pitr … is not available for the
group"). Older damage can only go back to the last dump in
`~/Documents/board-vault-backups/`, so notice and act within the day.

A restore never overwrites production. It creates a new database from the
moment before the damage; you check it, then point the API at it.

1. Pick a time just before the damage, in UTC, and copy production as it was:

   ```sh
   turso db create board-vault-restored --from-db board-vault \
     --timestamp 2026-11-17T10:00:00Z --group board-vault-group
   ```

2. Check it: `turso db shell board-vault-restored` and look at the rows that
   were damaged, plus `PRAGMA integrity_check;`.
3. Point production at it: set `TURSO_DATABASE_URL` (`turso db show
   board-vault-restored --url`) and a new `TURSO_AUTH_TOKEN` (`turso db tokens
   create board-vault-restored`) in Vercel for `board-vault-back`, then
   [force a build](../environments.md#environments). Check `/health/ready`.
4. Writes made after the chosen time are not in the copy. Re-enter what
   matters by hand, from the damaged database, before destroying it.
5. The restored database is production from now on. Keep the damaged one
   until you are sure, then destroy it. To get the `board-vault` name back,
   take a dump of the restored database, destroy the old `board-vault`,
   create it again from `--from-db board-vault-restored`, and point Vercel
   at it as in step 3.

Copies hold real data: destroy any you only made to look
(`turso db destroy <name> --yes`).
