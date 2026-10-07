# ADR: Clerk user lifecycle sync

- **Status:** Accepted
- **Date:** 2026-10-01
- **Supersedes:** None
- **Superseded by:** [ADR-0018](0018-account-deletion-and-leaving-groups.md), for `user.deleted` only

## Context

Clerk owns credentials and email addresses (ADR-0012), but each Board Vault
`Account` keeps its own copy of the email, and the account row is what groups,
sessions, and history hang off. When a user changed their email or deleted
their Clerk account, Board Vault never heard about it: the account kept the
old email, and a deleted Clerk user left an active account behind.

## Decision

Clerk notifies the API through signed webhooks at `POST /webhooks/clerk`.

- **Verification first.** Every delivery is checked against
  `CLERK_WEBHOOK_SIGNING_SECRET` (Svix signature over the exact body, with a
  timestamp tolerance against replays) before its content is read. Invalid
  deliveries get `400`. Without the secret the endpoint answers `404`.
- **`user.updated`: sync the primary email.** The account linked by
  `clerkUserId` takes the Clerk primary email when it is verified and changed.
  If another account already has that email, nothing changes and a warning is
  logged; resolving it is an operator task, consistent with ADR-0012's "never
  link by email alone".
- **`user.deleted`: soft-delete the account.** *(Since ADR-0018 it runs the
  full account deletion instead: personal data removed, history kept as
  "Deleted account".)* The linked account is marked
  `isDeleted`, exactly like the existing account deletion. The row stays, so
  group history, sessions, and other members' records keep their references.
  The account can no longer sign in. Rows are never hard-deleted (see the
  data model's deletion rules).
- **Everything else is ignored**, and every handler is idempotent because
  Clerk retries failed deliveries.
- Log lines carry no identifiers, following the project's log boundary
  (`npm run lint:logs`). The Clerk dashboard keeps each delivery and its
  payload for tracing.

## Consequences

- Email changes and deletions made in Clerk reach Board Vault within seconds,
  without a scheduled job.
- A person who deletes their Clerk account and signs up again with the same
  email gets `409 ACCOUNT_EMAIL_CONFLICT`: the soft-deleted account still owns
  the email. Restoring or re-linking is an operator decision.
- The production Clerk instance needs a webhook endpoint subscribed to
  `user.updated` and `user.deleted`, and its signing secret in Vercel. Until
  then the endpoint is off.
- Other Clerk events (for example `user.created`) can be added later behind
  the same verified endpoint.
