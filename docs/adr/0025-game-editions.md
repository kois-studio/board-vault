# ADR: Game editions and which title a game shows

- **Status:** Accepted
- **Date:** 2026-10-25
- **Supersedes:** None
- **Superseded by:** None

## Context

A game is published in several languages, often under different names:
*Citadels* is *Ciudadelas* in Spanish, *Codenames* is *Código Secreto*.
`GameTranslation` holds one title per game and language, limited to `en` and
`es` (in the zod schema, the DTO type, and the admin form's two fields).
English acts as the canonical title without saying so: the catalogue sorts
by it, and about fifteen places in the frontend read `titleTranslations.en`
directly.

The interface language (ADR-0024) and the language of someone's copy are
independent. Someone using Board Vault in Spanish may own the English
*Codenames* and the Spanish *Ciudadelas*; a group of Spanish speakers may
own a German edition of a game that has no Spanish one. The title they know
is the one on their box. For some games the language of the copy also
matters at the table: *Codenames* in English is a different evening from
*Código Secreto*.

We also plan to give an edition its own artwork, and later perhaps its own
publisher and retail price, instead of one image per game (ADR-0015).

## Decision

### A game has editions

`GameEdition` replaces `GameTranslation`. An edition is one published
version of the game in one language: the thing on someone's shelf.

| Column | Meaning |
| --- | --- |
| `id` | Its own key, so other tables can point at an edition. |
| `gameId` | The game (cascade). |
| `languageCode` | BCP 47 language of the edition (`en`, `es`, `de`, `pt-BR`). Any language, not only the interface languages. |
| `title`, `normalizedTitle` | The published title and its search form (`normalizeTitle`). |
| `isPrimary` | The edition the game is best known by, usually the original. Exactly one per game (a partial unique index). |

- One edition per game and language for now, enforced by a unique **index**
  rather than a table constraint, so it can be dropped without rebuilding
  the table if two editions in one language (a second edition, a big box)
  are ever needed.
- The game keeps everything that does not change between editions: player
  counts, length, tags. Artwork and retail price stay on the game until an
  edition can override them; an edition without its own falls back to the
  game's.
- The migration is additive: create `GameEdition`, copy every
  `GameTranslation` row, mark the English row primary (or the only row when
  there is no English one), move the reads, and drop `GameTranslation` in a
  later migration once a release has run on the new table.

### People can say which edition they own

`OwnedGame.editionId` (nullable, `SET NULL` when the edition goes). Adding a
game with more than one edition asks which one, preselecting the edition in
the interface language, then the primary one. It can be changed on the game
page. NULL means "not said" and behaves like the general rule below.

Wishlists, group people's games, and played games stay at game level. A
play is of the game, whichever box it came out of.

### Which title a game shows

One rule, applied in the API:

1. **Someone's copy** (a shelf, the games a group person brings, who brings
   a game to a night): the title of the edition they own, when they said.
2. **Otherwise** (Browse, the game page heading, history, recommendations, a
   group's library): the edition in the reader's interface language, then
   the primary edition.

Every game in a response carries `title` and `titleLanguage` resolved by that
rule. Responses that need the alternatives (the game page's "Also known as",
Administration) add `editions`. The `titleTranslations` map leaves the
contract once the frontend no longer reads it. The frontend shows titles
only through `core/utils/gameTitle.ts`, and wraps a title whose language is
not the page's in an element with that `lang`.

Sorting by title uses the resolved title's normalized form, so the order
matches what the reader sees. Searching keeps matching every edition's
title: typing "ciudadelas" in the English interface still finds *Citadels*.

### Adding and editing games

- A proposal says which language its title is in (default: the proposer's
  interface language) and may add other known titles.
- The admin game form lists editions (language, title, primary) instead of
  two fixed fields. Language names are shown with `Intl.DisplayNames` in the
  interface language ("inglés", "English").

## Consequences

- Board Vault can hold a title in any language without a code change, and
  the interface languages can grow without touching the catalogue.
- A shelf shows what is on the person's own boxes, and the data is ready for
  per-edition artwork, a group library that says whose copy is in which
  language, and a recommendation reason about language-dependent games.
- Titles are resolved per reader, so a cached response with titles in it is
  keyed by the interface language (ADR-0024).
- One more question when adding a game with several editions.

## Alternatives considered

- **Keep `GameTranslation` and only lift the `en`/`es` limit:** the smallest
  change, but its key (game, language) cannot be pointed at from
  `OwnedGame`, and per-edition artwork has nowhere to go.
- **Call it `GameLocalization`:** accurate for a translated title, but what
  will hang off it (artwork, publisher, price, the copy someone owns) belongs
  to a published edition, which is also the word players use.
- **Always show the title in the interface language:** simple, but someone
  who owns the English *Codenames* would see *Código Secreto* on their own
  shelf.
- **A separate "game title language" preference:** some players call every
  game by its original name. It can be added later as a choice between
  "my language" and "original" in the second step of the rule; editions do
  not need it to work.
