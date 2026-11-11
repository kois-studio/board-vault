# Changelog

Board Vault follows semantic versioning for repository snapshots. The hosted
service at board-vault.com is open to anyone, but this repository does not
promise production support, a stable public API, or a managed product. A
version tag marks a state of the code that the owner approved, not a service
level.

## Unreleased

Changes after `0.1.0` are recorded here until the next owner-approved tag.
Release notes must describe product boundaries honestly and must not include
credentials, personal data, provider identifiers, or private operational
details.

## 0.1.0 — 2026-11-11

The public launch. Anyone can now create an account (#157), and the app speaks
English, Spanish, French, German, and Italian. Board Vault keeps your games,
plans game nights with your group, and remembers who played what and who won.

Board Vault is not a complete board-game catalogue, a marketplace, a social
network, or a managed SaaS. It is a small, open source tool for friends who
play together. This is the first release tag; it covers everything since
`0.1.0-beta.1`, the earlier development baseline described at the end of this
file.

### Groups and people

- Anyone can create an account. Sign-in and sign-up no longer describe the app
  as invite-only, and the public pages (landing, privacy, sign-in, sign-up) may
  appear in search results. If new accounts are paused, the sign-up page says so.
- Groups invite people by username only. Board Vault never stores someone
  else's email address. Someone new creates an account, then shares their
  username (#277). Inviting someone as a person already in the group still
  works, and only the invited account can claim that person.
- Group names are 2 to 40 characters. Creating a group takes you straight to
  inviting people.
- The group page reads top to bottom: the next night and the group's pulse,
  recent nights, standings, the library (filter it by number of players),
  games to buy, and people. Leaving the group is at the end of People.
- Any member can edit a group person's games and preferences. Whoever entered
  a game or preference hears when someone else changes it.
- Each person in a group has a page with the games they bring, roughly what
  their collection is worth, and their game nights. Worth comes from each
  game's recommended retail price, never from what anyone paid (ADR-0016).
- Every group has a history, "What changed", at the end of its page. It shows
  who planned, started, finished or cancelled a night, who is invited, the
  shortlist, who brings what, the results, who joined, left or was removed,
  and who added or changed a group person. Nothing in it can be edited; a
  mistake is fixed by changing it back, and both changes stay. Only members
  see it.
- The group page shows standings and stats from finished nights: wins, games
  and nights per person, the most played games, and games someone owns that
  the group has never played.
- When someone leaves a group, past nights still list them as "Name (left)".
  They come off upcoming nights, and nights they organised pass to the group
  owner. Deleting a group removes its game nights first.
- A member shows with the same name and avatar everywhere in a group.
- Home follows where you are. A new account sees one card to create its first
  group and a short checklist. With a group, the next game night leads,
  showing who is going, the shortlist, what you are bringing, and your
  answer. With several groups, each has a card; pinned groups lead.
- Your page (`/you`), visible only to you, shows nights, games played and wins
  across all your groups, your line in each group, and the games you play
  most.

### Game nights

- A game night is where the group decides what to play. The games on offer are
  those of the people coming. It shows the best suggestions for them, which
  change as people answer. Anyone coming can add a game to the shortlist and
  vote for the games they would play; the most wanted come first.
- Each shortlisted game says who brings it. Owners tap "I'll bring it", the
  organizer can name a friend without an account, and games nobody coming
  owns are flagged. Home lists what you are bringing.
- Anyone coming can start a night, record what was played and who came, and
  finish it. The organizer or the group owner decides who is invited and can
  cancel (ADR-0019).
- Sessions record who won each game, with optional scores. Ties, co-op wins,
  and nobody winning are all possible, and results can be corrected later.
- Recording a night keeps its group context, offers Today and Yesterday,
  suggests same-day sessions, and can start a night live. Completed
  recordings can be corrected, with protection against stale edits.
- After a night, an optional line asks for your rating of the games played.
  It can be dismissed.
- Answer "Can you make it?" straight from Home and Upcoming.
- Add a planned night to your calendar: Google Calendar, or an `.ics` file for
  Apple Calendar, Outlook and others.
- Notifications for game nights (planned, started, finished, cancelled) and
  for someone joining your group. The inbox checks for new ones every minute
  while the page is in view, and when you open it.
- Starting or finishing a night before its date asks first. Finishing one with
  no games asks whether to cancel it instead. Votes and "I'll bring it"
  belong to people still coming.
- Play has Upcoming, What to play, History, and Record. History is grouped
  by month, and recording a night takes three steps.

### Collection and games

- My Games, a Browse page, Reviews, and Wishlist. Browse filters the
  catalogue by number of players, length, and tags, can hide games you own,
  and sorts A-Z, shortest first, or newest. Filters live in the URL.
- A game page shows ratings, your copy, owners in each group, play count,
  and similar games. Ratings show out of 5 stars everywhere.
- The wishlist heart sits on game covers, every change can be undone from the
  toast, and wishlist cards have an "I bought it" button.
- Proposing a game asks where it should go once approved: your shelf, your
  wishlist, or neither. Admins are notified of new proposals; a rejected
  proposal opens "My proposals", where the reason is.
- Say which edition you own. Games store their titles as editions, one per
  language, and titles in groups, history and recommendations follow the
  page's language. Administration edits editions and their tags.
- Board Vault keeps its own copy of every game's artwork (ADR-0015). An
  image address an admin enters is downloaded, compressed to WebP and served
  from `/artwork/…`. No page loads artwork from another site.
- Administration → Usage shows anonymous usage statistics to admins.

### Languages

- English, Spanish, French, German, and Italian. The language menu in the
  header lists all five. An address without a language opens in the one you
  chose last, or else your browser's.
- Your choice is saved on your account, so Board Vault opens in it on another
  device.
- Everything people use is translated: the landing page, Home, groups,
  collection, game pages, Play and game nights, Settings, and notifications.
  Only Administration stays in English. Names and counts read naturally in
  each language ("Ana, Luis and Marta", "1 star").
- French, German, and Italian were reviewed before they were offered.

### Accounts and privacy

- Sign-in is handled by Clerk only (ADR-0012). The older password flows are
  gone. A username changed in Clerk reaches Board Vault at once, and Settings
  → Account says plainly when another account already has it (ADR-0017).
- You can delete your account in Settings → Account (ADR-0018). It removes
  your shelf, wishlist, ratings and the rest of your private data, takes you
  out of your groups, and passes groups you own to the member who joined
  first. Nights you already played keep you as "Deleted account", so your
  friends' history stays complete.
- Usage statistics are our own, with no third party and nothing stored in the
  browser: which pages are opened, which features are used, and two funnels.
  Events carry a code instead of the account and are deleted after 30 days;
  only anonymous daily totals stay. Settings → Privacy turns it off and
  deletes what was kept (ADR-0021).
- Names have at most 20 characters, and the API enforces it.
- Nobody can create their own notifications. Leaving a group removes your
  notifications about it.
- Signing out clears every account's data from the browser.

### Look and feel

- A new logo, "Round", and a plum palette, "Ciruela", in light and dark mode.
  Settings → Appearance adds the themes Felt, Harbor, and Graphite, and a text
  size (Default, Large, Larger). More contrast is used when the device asks.
- The app can be installed on phones, with app icons.
- A new landing page, collection first, with real, well-known games shown in
  our own flat cover art. It says plainly what a group sees (the games you
  own and your ratings) and what stays private (your wishlist and account).
- Navigation has three sections: Home, Collection, and Play. Settings is in
  the profile menu.
- Settings has Profile (how people in your groups see you), Account (username,
  email, password, devices), Appearance, Language, and Privacy.

### Reliability and speed

- Pages stop waiting after a few seconds, try once more, and then show an
  error with Retry. Saving is never repeated behind your back.
- When Board Vault cannot be reached, one notice says so and goes away once it
  answers. Opening the app signed in during an outage no longer looks like a
  failed sign-in.
- A change that could not be saved no longer looks saved.
- Public pages paint about twice as fast on phones. Clerk loads after the first
  paint, icons ship only the ones used, and Lighthouse scores in CI went from
  about 76 to 94-96. Hashed scripts and styles are cached for a year.
- History pages its nights instead of loading them all, and the game-night
  list is bounded (#252). Notifications go out after the answer, and cold
  starts do less work (#253, #254). Hot queries have the indexes they
  needed, and a session's account is remembered for a minute (#249, #250).
- The groups overview went from about 650 database queries to 15, and history
  loads in a fixed number of queries whatever the number of sessions.
- The API times out slow database and sign-in calls after 5 seconds with a
  stable error code, retries a read that timed out once, and writes JSON logs
  with a request id. An uptime check opens an `incident` issue while
  production is not ready.
- Invitation and game-proposal creation are rate limited per account.
- Dates come back in one shape, ISO in UTC, so the same night shows the same
  time everywhere.
- Many layout, accessibility, and wording fixes: long names stay inside
  cards, counts read right with one, and screen readers hear new
  notifications.

### For contributors

- The API runs on NestJS 12 and TypeScript 6 as an ES module package. Tests
  run on Vitest in both packages, and the frontend's now run in CI.
- Node.js 24 and npm 11 are used everywhere (`.nvmrc`, `engines`, CI, Vercel).
- TypeScript is strict in both packages. The frontend validates API
  responses with zod 4.
- Local development signs in with `+clerk_test` fixture accounts through a
  development Clerk instance. An optional local Redis profile is available.
- CI checks documentation links, Node version consistency, and Lighthouse
  scores for the landing, sign-in and sign-up pages.
- Documentation was rewritten around onboarding, maps, and how-to guides.
  Work is tracked in GitHub Issues. `docs/project-standards.yml` assesses the
  engineering standards rule by rule.
- Local checks work on Windows. Swagger UI is served outside production only.

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
