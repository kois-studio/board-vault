# API contract

The backend is a NestJS HTTP API without a global URL prefix. Runtime Swagger
is generated from the decorated source, and the reviewed snapshot is
[`api/openapi.json`](api/openapi.json).

The Angular client uses a typed API adapter and validates responses at the
application boundary. HTTP failures use a safe envelope containing a status,
stable code, human-readable message, optional details, and a request ID.
Unexpected provider and exception details are not returned to clients.

The committed snapshot is a review artifact, not a second source of truth. CI
builds the backend with disposable local provider values, regenerates the
snapshot, and fails if the generated contract differs from `api/openapi.json`.

Sensitive routes must derive the acting account from the authenticated request.
Group, collection, invitation, session, notification, and administrative
operations must authorize the target object server-side; client-supplied owner
or reviewer IDs are not authoritative.

## Compatibility

The frontend and the API deploy as separate Vercel projects, so for a few
minutes an old client can talk to a new API, and the reverse. The API has no
URL versioning; instead every change must work with the previous release of
the other side:

- add fields, routes, and optional inputs freely;
- to remove or rename, ship the replacement first, move the frontend to it,
  and remove the old one in a later release;
- never change the meaning or type of an existing field in place.

Endpoints consumed by third parties (today only the Clerk webhook) follow the
provider's contract.

## Language

Every request from the frontend carries `Accept-Language` with the page's
language (`en`, `es`, `fr`, `de`, `it`; [ADR-0024](adr/0024-interface-languages.md)).
`LocaleMiddleware` reads it into `request.locale` (the best supported match
for any other value, English without one), and handlers take it with
`@RequestLocale()`. A new account is created in that language. The API
returns facts (ids, codes, numbers, dates) and the frontend writes the
sentences; a response whose content depends on the language must include it
in its cache key. Where a response already had English for people
(notification `message`, recommendation `reasons` and `noResultReason`), it
keeps it for older clients and adds the facts beside it: the inbox's
`context`, `reasonCodes`, and `noResultReasonCode`. A deleted account is
still named `"Deleted account"`, which the app shows in the page's language.
`PUT /users/:userId` with `locale` saves the person's choice, returned on
their own profile (`GET /profile/users/:userId`) and on no nested user
response.
Browse sorts by the title of the edition in the reader's language, else the
primary edition, so the order matches what the page shows (ADR-0025).

Every game in a response (the shelf and wishlist, Browse, a game page and its
similar games, a group's library, insights, acquisition board and people
catalogue, recommendations, and the history of a person or a group) carries
`title` and `titleLanguage`, resolved in `request.locale` by one rule: the
edition in the reader's language, else the primary edition (a game with no
edition has an empty `title`). `title` is never the stored English title.
`titleTranslations` is a map by language code of the editions the endpoint
knows, for "Also known as" and search; endpoints that read a game from a
joined row list only the shown edition in it. The group's history names games
the same way (`games[].title`, `titleLanguage`), and the shared SQL for the rule
is `resolvedTitleSql` (`backend/src/modules/common/database/resolved-title.ts`).
Administration (`/admin/games`) is not resolved per reader: an `AdminGameDto`
has `title`, the primary edition's title (empty for a game with no edition),
and `editions`, every edition as `{ id, languageCode, title, isPrimary }`, the
primary one first, then by language code. `PATCH /admin/games/:id` takes
`editions`, the game's whole new set of `{ languageCode, title, isPrimary }`:
at least one, titles trimmed and not empty (200 characters), language codes
unique and exactly one primary, else 400. A language code is two or three
letters and an optional region, canonicalized (`pt-br` becomes `pt-BR`); an
edition may be in any language, not only an interface language. Editions whose
language stays keep their `id`; the ones left out are deleted, and the legacy
`GameTranslation` rows follow. The admin `issue` filter and the overview's
`catalogueIssues` count `no-title` (no edition), `no-artwork`, `no-primary`
(editions but none primary), `no-tags`, and `no-price`; the catalogue search
matches any edition's title.

A proposal (`POST /profile/users/:userId/proposals`) says which language its
`title` is in with `titleLanguage` (default: `request.locale`) and may list
`otherTitles`, up to ten `{ languageCode, title }` in other languages, none in
the title's language and one per language. Proposals read back `titleLanguage`
(`en` for proposals made before it was recorded) and `otherTitles` (`[]`).
Approving a proposal takes the same `editions` as a game update; left out, the
game gets the proposal's title in its language as the primary edition, plus
its other titles.

Someone's copy of a game can say which edition it is (ADR-0025). `GET
/collection/games/:gameId/editions` lists a game's editions as `{ id,
languageCode, title, isPrimary }`, the primary one first; a game page's
`editions` is the same list. `POST /collection/users/:userId/games/:gameId`
takes an optional `{ editionId }`, which must be an edition of that game
(else 400); left out it is stored as `null`, "not said", which is also what a
game with one edition gets. `PATCH /collection/users/:userId/games/:gameId/edition`
with `{ editionId: number | null }` changes or clears it (400 for another
game's edition, 404 for a game not on the shelf). An admin removing the edition
sets it back to `null`. Where a title belongs to someone's copy, the edition
they said they own wins (rule 1), else the rule above: the shelf
(`GET /collection/users/:userId/games`, each entry with `ownedEditionId`, its
`title` and `titleLanguage` those of the owned edition), the game page's
`ownedGameData` (`editionId`, and `title` and `titleLanguage` of the copy), and,
as `copyTitle` and `copyTitleLanguage` (null when not said, so the game's own
title applies), the entries of a night's `gameBringers` and the `ownership`
of a group person linked to an account. `resolvedTitleSql`'s sibling
`ownedTitleSql` writes the same rule in SQL. Browse, the game page heading,
a group's library, recommendations and history stay on the reader's language.

Tag and tag category names are vocabulary, so they follow the reader's
language: `GET /collection/tags` and a game page's `tags` name them in
`request.locale` (English where a language has no name yet) and sort them as
that language sorts. Administration reads and writes the other languages as
`translations` (`{ es, fr, de, it }`) on `/admin/tags` and
`/admin/tag-categories`; in a request, a language left out stays as it is and
an empty string removes it. Admin game lists keep English names.

## Collections

Catalogue browsing and admin listings are paginated with a maximum page size
enforced in the DTO. Per-account and per-group lists (collection, wishlist,
members) are bounded by their owner and returned whole; an inbox answers the
latest 100 notifications, newest first. Lists that grow with every night
played are paged or bounded instead (see History).

## History

A person's history grows with every night, so no response carries all of it
(#252). Each reads only the account's current groups.

- `GET /play/users/:userId/history/page` answers `{ entries, hasMore }`: up to
  `limit` completed nights (20 by default, 1 to 50), newest first. `before`
  is the id of the last night already shown, and the page continues after it,
  so nights that share a date are never skipped or repeated. `groupId` keeps
  one group's nights and `gameId` the nights a game was played on. Unknown
  parameters answer `400`.
- `GET /play/users/:userId/history/summary` answers the totals over every
  night of the same filters (`groupId`, `gameId`): `nights`, `gamesPlayed`
  (each play counted), `uniqueGames`, `people` (each person once, a group
  person linked to an account counted as that account), `mostPlayed` (the
  game played on the most nights, a tie going to the first title in the
  reader's language; `null` with none) and `myMostPlayed` (the five games
  the account played most, then won most). It takes the same few queries
  however long the history is.
- `GET /play/users/:userId/meets` answers every scheduled or live night,
  every night of the last 30 days, and each group's last completed night,
  newest first. Older nights are in the history.
- `GET /play/users/:userId/meets/around?groupId=&date=YYYY-MM-DD` answers
  `{ meets, records }`: one group's nights (any status) from the day before
  `date` to the day after, newest first, and the history records of the
  completed ones. The client keeps those on `date` in each night's own time
  zone. The session wizard asks for it when you record a night older than the
  session list holds, to warn about one already recorded that day. A group the
  account is not in answers none; an invalid day answers `400`.
- `GET /play/users/:userId/history` still answers every night at once, for the
  previous frontend release while both deploy. It is deprecated and is removed
  in a later release.

## Groups

What a group answers no longer grows with every game its people own (#262).
Each route checks that the caller is the user in the address, and the routes
for one group that the caller is a member of it (`403` otherwise). Each takes
the same few queries however many groups, people and games there are.

- `GET /dashboard/users/:userId/group-overviews` answers the account's groups:
  each group's fields, `gameCount` (the
  group's games, each counted once), `members` (public profile, `joinedAt`,
  `gameCount`) and `placeholders` (the group's active people without an
  account: `id`, `displayName`, `avatar`, `gameCount`). No games, ratings or
  emails, so its size does not change with what anyone owns.
- `GET /dashboard/users/:userId/group-overviews/:groupId` answers one of them,
  as in the list, for a page about that group.
- `GET /dashboard/users/:userId/groups/:groupId/shelf` answers what a page
  about the group's games needs: `games` (each once, with its title in the
  reader's language, sorted by it), `owners` (one entry per member with
  `accountId`, then per active person without an account with
  `groupPersonId`, each with the `gameIds` they bring) and `reviews` (the
  members' ratings).
- `GET /dashboard/users/:userId/groups` and
  `GET /dashboard/users/:userId/groups/:groupId` still answer every member's
  games and ratings, for the previous frontend release while both deploy.
  They are deprecated and are removed in a later release.

## Browser caching

Answers are not cached by default. A route whose answer changes rarely and is
the same for every reader may let the browser keep it, with
`RarelyChangingInterceptor`: `Cache-Control: private, max-age=300,
stale-while-revalidate=86400` and `Vary: Accept-Language`, set only on a
successful answer. `private` keeps it out of shared caches. A browser may then
show an answer up to five minutes old, and for up to a day after that, an
older one for one load while it fetches a fresh one. Errors and refused
requests are never kept: `ApiErrorFilter` removes the header. Today only
`GET /collection/tags` does: the Browse and admin tag filters can show a tag
added, renamed, or merged recently as it was. Never add it to a route
whose answer depends on who asks, since the browser keeps it whoever signs in
next. Artwork has its own caching (see [Artwork](#artwork)).

## Dates

Session dates (`meetDate`, `sessionDate`, `lastPlayedAt`) and a notification's
`createdAt` are answered as ISO 8601 in UTC, such as `2026-10-08T18:00:00.000Z`, whatever shape they were
stored in. A stored date with no zone, as SQLite's `CURRENT_TIMESTAMP` writes
it, is UTC. SQL compares and orders them through `datetime()`, so mixed shapes
sort by instant.

## Artwork

Game artwork is served by the API itself (ADR-0015). A game's `imageUrl` is
`/artwork/<gameId>-<hash>.webp`, a path to resolve against the API address,
or empty for none. `GET /artwork/<file>` needs no token and is cached for a
year, because the hash changes with the image. An address with any other
hash, such as one a page kept from before the artwork changed, answers
`302` to the current address, cached for five minutes, and never reads the
image. Admins set artwork by sending
an image address (`PATCH /admin/games/:id`, proposal approval), which the API
downloads and stores, or by uploading the file
(`PUT /admin/games/:id/artwork`, image body up to 4 MB).

## Recording and Home preferences

`GET|PUT /profile/home` read/write only the authenticated account's pins,
group sort and dismissed personal rating reminders. No account id is accepted
from the client. Pins are filtered to current groups.

`POST /sessions` accepts repeated game entries, each with its own players and
optional results; actual play needs a catalogue game, not ownership.
`GET /sessions/:sessionId/recording` returns the ordered plays and a revision.
`PUT /sessions/:sessionId/recording` atomically corrects a recording and requires
that revision. Group and lifecycle state are preserved; roles and identities
are validated server-side. A stale recording receives 409. Individual results
are saved with `PUT /sessions/:sessionId/plays/:position/results`, also with a
revision, by any group member. Legacy per-game editors refuse repeated games.
`POST /sessions/live` creates an active spontaneous night with server time.
See [ADR-0022](adr/0022-everyday-play-and-corrections.md).

## Creating safely twice

A write the API cannot confirm (a timeout, a lost connection, a 504, or a 503
`DATABASE_TIMEOUT`) may still have been saved (#246). Creating a game night
accepts an optional `Idempotency-Key` header so the app can send the same
submission again without recording the night twice:

- `POST /sessions`, `POST /sessions/scheduled` and `POST /sessions/live` read
  it. Its value is a UUID (any case); anything else answers `400`
  `IDEMPOTENCY_KEY_INVALID`.
- The key is stored per account, in the same transaction as the night, for
  24 hours. A repeat with the same key, route and body answers like the first
  request, with the same session id, and changes nothing: no second night, no
  second notification, and no second usage event. It is answered before the
  request is checked again, so it works even if the group or its games
  changed since. Two requests racing with one key also create one night.
- People are told and the creation is counted by one request only: the first
  one past the write. When the write committed but the answer timed out
  (`503 DATABASE_TIMEOUT`), the retry does it instead (`completedAt`), so
  nobody is told twice and nobody is left untold.
- A repeat answers the id it first created even if that night was deleted
  since; reading it then answers `404`.
- The same key with another route or body answers `422`
  `IDEMPOTENCY_KEY_REUSED`. After 24 hours the key can be used again.
- Without the header a request creates as before, so older clients keep
  working. CORS allows the header.

The app makes a key for each submission and keeps it while the person retries
the same submission; changing the night makes a new one.

## Changing a route or DTO

1. update the source contract and relevant response schemas;
2. regenerate and review the OpenAPI snapshot;
3. add authorization, malformed-input, and privacy regression coverage;
4. run the package checks listed in the package manifest.
