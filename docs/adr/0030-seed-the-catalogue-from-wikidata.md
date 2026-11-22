# ADR: Seed the catalogue from Wikidata

- **Status:** Accepted
- **Date:** 2026-11-22
- **Supersedes:** None
- **Superseded by:** None

## Context

The catalogue holds the 66 games our first group played. Open registration
started on 2026-11-10, and we plan to announce Board Vault on forums in early
December 2026. Newcomers will look for the common games of their own country,
and most of those are missing, so each one would have to be proposed and
approved by hand (#358).

ADR-0014 left room for this: an external catalogue may be used as an
admin-side import that copies fields into our own tables, with nothing at
runtime reading from it. It asked for a new ADR to decide the source and its
licensing. This is that ADR.

The candidates, as of November 2026:

- **BoardGameGeek, scraped.** Its terms bar robots and spiders that request
  more than a person browsing would
  ([Data Mining](https://boardgamegeek.com/wiki/page/Data%20Mining)).
- **BoardGameGeek, through the XML API.** Since July 2025 it needs a
  registered application and a token, approved by hand. The licence is
  non-commercial, forbids modifying the data, requires the "Powered by BGG"
  credit, can be ended at any time, and bars AI training
  ([XML API Terms of Use](https://rpggeek.com/wiki/page/XML_API_Terms_of_Use)).
  Copying the data and correcting it in our tables conflicts with "no
  modification". If the licence ended we could be asked to remove the
  catalogue, the dependency ADR-0014 avoids.
- **Any large catalogue, copied wholesale.** In the EU, extracting a
  substantial part of a database is protected in its own right (the sui
  generis database right), even where single facts are not.
- **Wikidata.** Its data is released under
  [CC0](https://creativecommons.org/publicdomain/zero/1.0/): any use,
  modification allowed, no credit required, and it cannot be withdrawn. A
  query on 2026-11-21 found 1,617 board games published since 1980 that
  have a BoardGameGeek ID, 1,340 of them with player counts, and 263 with
  awards. Of 20 popular modern games, 16 matched by their exact English
  title, most with player counts and a Spanish title. Playing time is often
  missing, and there is no box art or price.

## Decision

The catalogue is seeded from Wikidata, by an admin-side import. We do not
scrape BoardGameGeek or use its API.

### What we take

From each Wikidata item: its labels in English, Spanish, French, German and
Italian, the minimum and maximum number of players (P1872, P1873), and the
playing time (P2047) when it has one. Labels become the game's editions
(ADR-0025), English as the primary edition when there is one. Nothing else
is stored. Publisher, year, awards and the BoardGameGeek ID (P2339) help pick
and check candidates, but stay out of our tables.

Artwork is not imported: Wikidata images are photos of play, not box art.
Imported games start without artwork and get it under ADR-0015, never from
BoardGameGeek and never made by AI.

### Which games

Published games with a BoardGameGeek ID and player counts, without
expansions or variants. Each scores the number of Wikipedia languages that
cover it plus 10 per game award (Spiel des Jahres, Kennerspiel des Jahres,
As d'Or, Juego del Año, Gioco dell'Anno and similar; wargame awards do not
count). Games below a minimum score are left out, and games from before 1980
need a higher one, so household classics such as *Monopoly* stay and
forgotten ones do not. A few hundred at a time, not the whole of Wikidata.
Games Wikidata describes poorly (no BoardGameGeek ID or player counts) are
missed; proposals cover them.

### How it runs

1. **Candidates** (#360): a script queries the Wikidata Query Service at a
   polite pace, with a User-Agent naming Board Vault, and writes
   `database/catalogue/wikidata-candidates.json`. CC0 data with no personal
   details, so it lives in Git. The PR that adds or changes it is the review:
   wrong games and bad titles are removed there.
2. **Import** (#361): a script reads the reviewed file and, per game, updates
   the game with the same `Game.wikidataId`, else links an existing game
   with the same primary title, else adds the game and its editions. It only
   fills empty fields and never overwrites what an admin set. It has a dry
   run, runs on the development database first, and runs on production after
   a backup, like a one-off data change (add-migration.md).
3. **After the import** the games are ours like any other: admins edit them,
   proposals and approval keep working, and a later import is a fresh,
   reviewed run.

`Game.wikidataId` (migration 0037) records the item a game came from or was
matched to: unique, `Q` and digits, NULL for games that only came through
proposals.

### Credit

CC0 asks for none. We credit Wikidata anyway in the docs and wherever we
describe where the catalogue comes from.

## Consequences

- The catalogue grows by hundreds of games without third-party keys,
  licences that can end, or runtime calls.
- Wikidata labels are sometimes a Wikipedia article title rather than the
  title on the box, and the original language is not always marked. The
  review of the candidate file catches what it can; admins fix the rest.
- Many imported games have no playing time and no artwork. The app must show
  them as unknown, not as zero (#362).
- Wikidata misses games that nobody added to it, often recent or local ones.
  Proposals still cover those, and we can add missing items to Wikidata
  ourselves.

## Alternatives considered

- **BoardGameGeek, scraped or through the API:** better coverage and
  playing times, but against its terms or under a licence that forbids
  edits and can be revoked.
- **Adding games by hand only:** no licensing questions, but far too slow for
  the announcement.
- **A runtime search against Wikidata:** quick to build, but a runtime
  dependency that ADR-0014 rules out, and unreviewed data on every shelf.
