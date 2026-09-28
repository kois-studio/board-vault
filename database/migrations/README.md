# Database migrations

Migrations are numbered, additive SQL changes. Each migration must be
reviewed, forward-executable from the documented baseline, and verified against
both an empty disposable database and representative synthetic data.

Run the migration runner with the target database configured through the
environment:

```shell
MIGRATION_BASELINE=0005 node database/scripts/migrate.mjs
```

The runner records applied versions in `SchemaMigrations`, applies each pending
file transactionally, and refuses an empty tracking table without an explicit
baseline. Never commit database exports, credentials, or real account data.

Before a shared-environment rollout:

1. take a private backup;
2. restore it into a disposable database and apply the migration;
3. run integrity, foreign-key, and representative-query checks;
4. record the operator, target, result, and rollback plan in private release
   notes.
