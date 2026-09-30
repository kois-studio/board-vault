# Data model

Board Vault separates authenticated accounts from group-scoped participation.
Accounts own private collections and act as authorization identities. Groups
contain memberships, shared decisions, sessions, and group-scoped participant
profiles. A participant profile may represent an unregistered person and can
later be linked to an account without rewriting group history.

The reviewed schema is [`database/schema/schema.sql`](../database/schema/schema.sql)
and changes are additive numbered migrations under
[`database/migrations/`](../database/migrations/). The snapshot is not a
substitute for a migration and must only be used with disposable verification
or an approved private rollout procedure.

Persistence rules:

- private account data is never exposed through group-member projections;
- group reads are membership-scoped and participant claims are email- and
  group-bound server-side;
- `Account` stores no credentials; Clerk owns passwords and verification, and
  `clerkUserId` is the only provider link (ADR-0012);
- multi-record writes define transaction, duplicate, and partial-failure
  behavior;
- fixtures and verification databases use synthetic data only.

When the schema changes, update the migration, affected queries and API
contract, privacy/authorization tests, and disposable empty-state and
representative-data checks together.
