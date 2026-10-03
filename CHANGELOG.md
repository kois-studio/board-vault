# Changelog

Board Vault follows semantic versioning for repository snapshots. The
application is still a private, invitation-only beta; a public Git repository
is not the same thing as a hosted product release.

## Unreleased

Changes after `0.1.0-beta.1` are recorded here until the next owner-approved
tag. Release notes must describe product boundaries honestly and must not
include credentials, personal data, provider identifiers, or private
operational details.

### Changed

- The session page is redesigned: a date header with the status, your RSVP
  and the organizer's actions; the games played tonight with their players
  and winners; the shortlist; and who's coming with attendance alongside.
- Sign-in is Clerk-only (ADR-0012). The legacy password, email-verification,
  and password-reset flows and their endpoints are removed, and migration 0015
  drops the credential columns.
- Local development signs in with `+clerk_test` fixture accounts through the
  development Clerk instance.
- Node.js 24 everywhere (`.nvmrc`, `engines`, CI, Vercel).
- Invitation and game-proposal creation are rate limited per account, and the
  API sees real client IPs behind Vercel.
- Swagger UI is served outside production only.
- Documentation rewritten around onboarding, maps, and how-to guides; work is
  tracked in GitHub Issues.
- Frontend unit tests run on Vitest (Karma and Jasmine removed) and now run in
  CI.
- Navigation is back to three sections, Home, Collection, and Play. Groups
  live on Home, History is under Play, and Settings is in the profile menu.
  Home is redesigned around invitations, the next game nights, your groups,
  and recently played sessions.
- Collection and Play pages are redesigned: a new game page (ratings, your
  copy, owners in each group, play count, similar games), a filterable and
  sortable My Games grid, a Browse page that lists games before you search,
  compact upcoming sessions, and shorter group and session pages.
  `/collection` and `/play` open a hub with a card for each subpage and its
  count; recent collection activity sits under the Collection cards.
- New colour palette, "Ciruela": plum primary, Sunglow accent, and lilac or
  plum-charcoal backgrounds, in light and dark mode. Colours come from theme
  tokens (`bg-bv-surface`, `text-bv-primary`) instead of Tailwind's palette,
  secondary buttons are outlined, and avatars use eight player colours that
  follow the theme (earlier avatar colours map onto them).
- Collection pages, after a review pass:
  - The wishlist heart is back on game covers (game page, Browse, and
    Wishlist). With a mouse it slides open to say "Add to wishlist" or
    "Remove from wishlist", and every change can be undone from the toast.
    Browse can now save a game to the wishlist.
  - Wishlist cards have an "I bought it" button that moves the game to My
    Games, and an empty wishlist explains how to add games.
  - The Collection hub cards have colour again: a faint tint per section
    with a stronger icon tile (plum, green, amber, red).
  - The (?) next to Recent activity explains what the list records, how
    long it keeps it, and who sees it. It opens on hover or on a tap.
  - Reviews lists the games waiting for your rating even before your first
    rating, shows each game once, and sorts your ratings A–Z, by rating, or
    by date. Rating a game no longer reloads the whole list.
  - My Games shows its filters from 12 games and filters by player count
    instead of sorting by maximum players.
  - Recent activity updates after changes instead of on the next sign-in.
- Play pages, after a redesign:
  - The Play hub cards each have a colour (Upcoming plum, What to play
    Sunglow, History green, Record a session amber) and match the tabs.
    "Discover" is now "What to play", and the hub's main button plans a
    session.
  - Upcoming separates sessions waiting for results (planned nights that
    are over but were never completed), live sessions, and planned ones,
    with "in 6 days" style dates. "Plan a session" goes straight to the
    group when you only have one.
  - What to play uses chips for the group, the people coming, the time, and
    the mood, and updates the suggestions as you change them. Interested
    and Not for us are thumbs on each suggestion, and the best fit is
    marked as the top pick.
  - History is grouped by month, with compact session cards (avatars, games
    with who played them, "Everyone played"), shows ten sessions at a time,
    and gives people without an account their initials instead of a blank
    avatar.
  - Record a session has three steps instead of seven: who and when, the
    games with their players, and a note with a summary. Games can be
    searched, and changing the attendees keeps the games and players
    already chosen.
- Suggestion reasons no longer list everyone coming as the owners of a game
  ("Owned by 1 of 3 selected people (Ana, Bo, Cris)"); they give the count
  only, as the names were not the owners.
- Buttons share one component: `appButton` goes on a native `<button>` or
  `<a>` (replacing the `<app-button>` wrapper and hand-written `app-btn-*`
  classes), primary buttons are indigo everywhere, and every button shrinks
  slightly when pressed.
- Group cards count the group's people without an account and the games
  they own.
- The groups overview and history load games, titles, and people in
  set-based queries (the groups overview went from about 650 queries to 15).
  Personal and group history load session details in five queries,
  whatever the number of sessions.
- Backend queries are split into per-domain classes
  (`databaseService.groups.getGroupById`, …).
- The backend deploys with Vercel's NestJS preset instead of the legacy
  `builds` configuration.

### Fixed

- Marking the first game of a live night no longer moves the rest of the
  shortlist to "not played"; that happens when the night is finished.
- Marking a game as played in a session with group people no longer fails
  (the page sent an empty account list the API rejects).
- Pages update after slow actions again: the session page kept showing
  "Saving…", and the group settings page could miss the email invitation
  link, because Angular now checks components only when told (OnPush by
  default). Invitation cards, the group forms, the game proposal form and
  the invitation sign-up keep their busy state in signals.
- Signing in no longer fails at random when the database is slow to answer
  its first query after a quiet spell: a read that times out is tried once more.
- A long name without spaces no longer makes the group page wider than a
  phone screen; it is cut off with an ellipsis in its card.
- The Collection tabs fit on a phone screen; Wishlist was cut off.
- Search boxes, filters, and form fields have a background in light mode
  again (they were see-through after the palette change).
- Hub card counts say "1 game" and "1 review", and show "Loading…" while
  loading instead of 0.
- The game page cover fills its frame.

- The avatar editor (Settings → Account) and the invitations and
  notifications dialogs in the profile menu open again. They had stopped
  rendering under Angular 22's default `OnPush` change detection. Saving an
  avatar now sends one profile update instead of two.
- Avatar changes save again for icon and emoji avatars with empty initials:
  the API requires initials only for an initials avatar. The editor no longer
  shows an unsaved avatar as if it were saved, and a failed profile update
  shows an accurate error.
- Approved game proposals without artwork no longer point to a dead
  third-party placeholder image.
- Play › History lists the attendees and players of sessions recorded with
  group people (the session wizard records them that way) instead of
  "Attendance not recorded". The group page and Home count each person once
  when a session lists both their account and their group person, and
  history people include the linked `accountId` and fall back to the
  account's avatar.
- Long names without spaces no longer overflow their cards or widen the
  page on phones. They wrap in attendee pickers, group and session cards, and
  recommendation explanations, and history's "Played by" line stops at two
  lines.
- Local checks on Windows: `.gitattributes` keeps LF line endings regardless
  of `core.autocrlf`, and backend e2e cleanup tolerates the SQLite file lock
  that the native libsql driver holds until the test process exits.
- The group page section links (Decide, Games to acquire, People, …) and the
  "Skip to main content" link stay on the current page. Under
  `<base href="/">` they resolved to `/#section` and reloaded the app on the
  landing page; they now scroll to the section and move focus to it.
- "Submit Your First Game" and "Submit New Game" show the game proposal
  form again. The dialog's Tailwind 3 backdrop was opaque and painted over
  the form under Tailwind 4.
- Long session and proposal notes without spaces wrap inside their cards on
  the group page, the session page, Play › History, My submissions, and the
  wizard's review step, which also wraps long attendee, group, and game names.
- Red buttons such as "Delete group" show white text in light mode again;
  the danger button style had no text colour.
- "Record a past session" works end to end again. Attendees no longer reset
  when you move to the Games step, Save session is enabled on the review
  step, saving a session with group people no longer fails with a 500 (the
  session service called group queries with the wrong `this` after the
  DatabaseService split), linked people show their account avatar and
  username, and Play › History and Home show the new session without a
  reload.

### Added

- Sessions record who won each played game, with optional scores. Ties,
  co-op wins, and nobody winning are all possible, and results can be
  corrected after the night is over (API and migration 0016). Anyone in the
  group marks the winners on the session page; History and the group page
  show who won.
- The group page shows standings and stats from finished game nights: wins,
  games and nights per person, the most played games with when they were last
  played, and games someone owns that the group has never played
  (`GET /groups/:groupId/insights`).
- Add a planned game night to your calendar from its page: Google Calendar,
  or an `.ics` file for Apple Calendar, Outlook and others.
- Turso and Clerk calls time out after 5 seconds with a `503` and a stable
  error code; the database client closes on shutdown.
- JSON logs on Vercel with the request id on every line, and an uptime check
  that opens an `incident` issue while production is not ready.
- Optional local Redis profile (`docker compose --profile redis up -d`).
- CI check for documentation links and Node version consistency.
- Clerk webhooks keep account emails in sync and soft-delete accounts whose
  Clerk user is deleted (ADR-0013).
- Rule-by-rule engineering-standards assessment in
  `docs/project-standards.yml`.

## 0.1.0-beta.1 — public development baseline

This is the first explicitly versioned public development baseline. It is not
a promise of production hosting, support, open registration, a complete game
catalogue, or a stable public API.

- Added the current group-centered information architecture and responsive
  navigation.
- Added explainable recommendation, acquisition, session, history, and
  group-person privacy boundaries.
- Added public contributor, design-system, release, and local synthetic-data
  guidance.
