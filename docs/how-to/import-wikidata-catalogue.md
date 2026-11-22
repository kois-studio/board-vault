# Import the Wikidata catalogue

Seeds the catalogue from the reviewed candidate file (ADR-0030, #361). Run it
after a reviewed change to `database/catalogue/wikidata-candidates.json` is
merged: a first import, or more games after a longer list.

## What it does

`database/scripts/import-wikidata-catalogue.mjs` reads the candidate file and,
per game:

1. **Same `wikidataId`:** that game. It fills only what is empty.
2. **Same title:** otherwise, a game that has no `wikidataId` and an edition
   titled like one of the candidate's titles, or its `matchTitles`, is
   linked. It gets the `wikidataId` and keeps its own data.
3. **New game:** otherwise, it inserts the game, with no artwork, length 0
   (unknown) when Wikidata has none, and one edition per title.

Filling only touches empty data:

- a length of 0 or NULL;
- missing player counts;
- editions in languages the game lacks.

It never changes titles, artwork, prices or tags. A title another game
already has is left out, so a title search finds one game. A candidate whose
titles match two games is skipped and reported.

It is a dry run unless you pass `--apply`. The write is one batch, so it is
all or nothing. A second run reports no changes. It refuses a file that still
has candidates with `check`, and a database that is not at the schema it
expects.

## Run it

Run it on the shared dev database first, then production. Only David runs it
on either.

1. **Back up**, as in [add-migration.md](add-migration.md) step 1. Use
   `dev-<date>-before-import.sql` and `prod-<date>-before-import.sql`.
2. **Dry run.** Read every `link`, `fill` and `skip` line. A link to the wrong
   game, or a `skip`, gets an `exclude`, an `override` or `matchTitles` in
   `database/catalogue/wikidata-review.json`, in a pull request, before you
   go on.
   ```shell
   umask 077
   export TURSO_DATABASE_URL="$(turso db show board-vault-development --url)"
   export TURSO_AUTH_TOKEN="$(turso db tokens create board-vault-development --expiration 1d)"
   node database/scripts/import-wikidata-catalogue.mjs
   ```
3. **Apply**, then run it again. The second run must say
   `0 to insert, 0 to link, 0 to fill`.
   ```shell
   node database/scripts/import-wikidata-catalogue.mjs --apply
   node database/scripts/import-wikidata-catalogue.mjs
   ```
4. **Check:**
   - `pragma integrity_check` and `pragma foreign_key_check` come back clean.
   - `/health/ready` reports `ready`.
   - Browse lists the new games.
   - Opening one in Administration → Games and saving a tag works.

   A game's cached details expire within an hour.
5. **Production:** repeat with `board-vault` instead of
   `board-vault-development`.

## Undo it

Every imported game has a `wikidataId`, and so does every linked one.

- **Imported games:** deleting a new game removes its editions too. Do it only
  while nobody has it on a shelf, a wishlist or in a play. After that, fix the
  game in Administration instead.
- **Linked games:** these existed before, so never delete them. Restore the
  backup only if the import went wrong as a whole, within the restore window
  ([recover-production.md](recover-production.md)).
