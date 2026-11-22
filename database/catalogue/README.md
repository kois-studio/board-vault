# Catalogue seed data

Games picked from [Wikidata](https://www.wikidata.org) to seed the catalogue
(ADR-0030, #358). Wikidata's data is CC0; these files hold no personal
details, and nothing at runtime reads them.

| File | What it is |
| --- | --- |
| `wikidata-candidates.json` | Generated. The games to import, best known first. Do not edit by hand: a rerun overwrites it. |
| `wikidata-review.json` | Hand-written. Review decisions the script applies on every run: `exclude` (item → why it is left out) and `override` (item → fields that replace Wikidata's: `title`, `titleLanguage`, `otherTitles`, `minPlayers`, `maxPlayers`, `durationMinutes`, and `matchTitles`: other names the import finds an existing game by, such as Clue for Cluedo, never written as titles). An empty override marks an item as checked. |

## Regenerate

```shell
node database/scripts/wikidata-candidates.mjs            # up to 400 candidates
node database/scripts/wikidata-candidates.mjs --limit 600
```

It sends a few queries to the Wikidata Query Service, takes under a minute,
and gives the same file for the same Wikidata data.

## Review

The script drops a trailing Wikipedia disambiguation from every title
("Mombasa (gioco)" → "Mombasa") and starts each with a capital letter.

Each candidate has the primary `title` in `titleLanguage`, `otherTitles`
only where a language's title differs, player counts, `durationMinutes`
(NULL when Wikidata has none), `year`, the number of `awards` and of
Wikipedia `sitelinks`. Candidates the script is unsure about carry `check`:
the same title as another candidate, no English title, more than 20 players,
one exact player count, or a title that may name an edition.

Read the diff in the pull request. For anything wrong, add an `exclude` or
an `override` to `wikidata-review.json` and regenerate, until no candidate
has `check`. The import (#361) only reads the generated file.

## Import

`database/scripts/import-wikidata-catalogue.mjs` writes the file into a
database: dry run by default, `--apply` to write. How and when to run it:
[docs/how-to/import-wikidata-catalogue.md](../../docs/how-to/import-wikidata-catalogue.md).
