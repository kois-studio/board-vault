# ADR: Lists loaded when a page shows them, from a small cache of our own

- **Status:** Accepted
- **Date:** 2026-11-15
- **Supersedes:** None
- **Superseded by:** None

## Context

`DataService` loaded 13 lists for the signed-in person as soon as they were
known, plus the invitations of each group they own: games, groups,
notifications, invitations, reviews, game nights, history, history totals,
wishlist, collection activity, proposals, proposal stats and stats. That was
18 requests on every cold load, `/settings/profile` included, and each one ran
the account lookup on the API. One failing list could also hold up a page that
did not need it (#263, part of the audit in #237).

The pieces to build on were already there. `ResourceSignal` (#256) holds one
piece of data with one state (loading, refreshing, error, ready), and
`DataService.groupShelf` (#262) already kept each group's shelf by id until a
change made it stale.

## Decision

### A small keyed cache of our own, not TanStack Query

David decided on 2026-11-12 (#263): an in-house cache on top of
`ResourceSignal`. TanStack Query for Angular was the other option. We chose not
to use it because:

- **No new dependency.** The cache is about a hundred lines
  (`core/async/resource-cache.ts`) on top of what we have.
- **One state model.** Pages already render `ResourceState` through
  `<app-async>`. TanStack Query would bring its own query states, so pages
  would have two models to tell apart for a while, or all of them would move
  at once.
- **Still experimental.** TanStack Query for Angular is marked experimental.
  Its API may still change under us.

### How it behaves

- **A page names what it shows.** It calls
  `dataService.use(['games', 'wishlist'])` from its constructor. That counts
  the page as using those lists until it is destroyed. Components that live in
  the header do the same: the inbox uses notifications and invitations, and
  the avatar menu uses your proposal stats from its first open, because the
  count only shows inside the open menu. Home names everything Home shows, so
  it still loads all of it at once.
- **The first use loads.** A list nobody has asked for loads with its
  `loading` state, its failure toast, and *Try again*, as before (#241, #256).
  Nothing loads while nobody is signed in. Sign-in loads what the open pages
  use.
- **Later uses serve what is kept.**
  - Within `FRESH_FOR_MS` (30 s) of the last answer, nothing is asked.
  - After that, the page shows what is kept at once, and the list is read
    again quietly (`ResourceSignal.revalidate`). The state stays `ready`, a
    failure keeps what is shown without a word, and an answer equal to what is
    shown changes nothing, so the pages and caches that follow the list (the
    group shelves) are not disturbed.
- **Shared reads.** A read already on its way is shared: a second page that
  opens meanwhile asks nothing.
- **Writes invalidate by key.** The `refreshX` methods run after a write or a
  *Try again*.
  - A list some open page uses reloads at once, as before.
  - Any other list is marked stale, and the next page that shows it reloads
    it (`refreshing`), even if it is still fresh by age, so the copy from
    before the write is never shown as current. An answer still on its way for
    a list nobody shows is dropped, since it may predate the write.
- **The invitations of the groups you own** (`invitationsGroupIndex`, one
  request per group) are read only while a page shows them: Home, a group's
  page, or editing a group. They come with your groups, and are read again
  when your groups change in a way that may add a group you own. A change that
  only moves the game counts does not read them again (#262).
- **Game nights** are refreshed with the inbox when the tab comes back into
  view only while a page shows them. Otherwise the next page that does reads
  them.
- **The same person read again** (a new username, a saved profile) reloads
  what the open pages show and marks the rest stale. **Another person, or
  sign-out**, clears everything as before (`sign-out-state.spec.ts`).

## Consequences

- A cold `/settings/profile` sends only the account check and the inbox in the
  header. Other pages send what they show
  (`frontend/e2e/requests-per-page.spec.ts` counts them).
- Going back to a page shows its data at once, with no skeleton, and refreshes
  it quietly.
- A page that reads a `DataService` list must name it with `use`. Without
  that, a cold load of that page shows the list as loading until another page
  asks for it. The spec fakes get a `use` that does nothing
  (`withStates` in `core/async/resource-state.testing.ts`).
- A list nobody shows is not kept up to date in the background, so a page that
  opens later may show a copy up to 30 s old for a moment, then the fresh one.
  It shows "refreshing" only after a write.
- If we ever want TanStack Query, the cache's surface is small (`use`,
  `invalidate`, `ResourceSignal`). Moving to it later would be a contained
  change.
