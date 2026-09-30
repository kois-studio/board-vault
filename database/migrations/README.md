# Migrations

Numbered, additive SQL files. The runner (`../scripts/migrate.mjs`) records
applied versions in `SchemaMigrations` and applies each pending file in a
transaction.

Follow [`docs/how-to/add-migration.md`](../../docs/how-to/add-migration.md).
