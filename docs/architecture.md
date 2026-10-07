# Architecture

```text
Browser ── Angular app (frontend/) ──► NestJS API (backend/) ──► libSQL: SQLite locally, Turso in production
               │                          ├──► Clerk (verify sessions, invitations)
               └── Clerk JS (sign-in UI)  └──► Upstash Redis (cache, rate limits; optional)
```

The API is the security boundary. It authenticates, authorizes, validates, and
persists. Frontend guards and hidden buttons are UX only.

## Request lifecycle

1. The Angular [`auth.interceptor.ts`](../frontend/src/app/core/interceptors/auth.interceptor.ts)
   adds the Clerk session token as `Authorization: Bearer …`.
2. [`LoggerMiddleware`](../backend/src/common/middlewares/logger.middleware.ts) assigns a request ID;
   [`ClerkSessionMiddleware`](../backend/src/common/middlewares/clerk-session.middleware.ts)
   verifies the token and resolves the local account into `request.user`
   (see [authentication.md](authentication.md)). Both run for every route
   ([`app.module.ts`](../backend/src/app.module.ts)).
3. Guards on the controller decide access (table below).
4. The global `ValidationPipe` ([`main.ts`](../backend/src/main.ts)) rejects
   unknown or malformed DTO fields.
5. The controller calls a service, which runs SQL through the per-domain
   query classes on
   [`DatabaseService`](../backend/src/modules/common/database/database.service.ts)
   (for example `databaseService.groups.getGroupById`). Queries are
   parameterized. Services map rows to DTOs.
6. Errors go through [`ApiErrorFilter`](../backend/src/common/http/api-error.filter.ts),
   which returns `{ statusCode, code, message, requestId }` and never leaks SQL
   or provider payloads.

Every provider call is bounded
([`provider-timeout.ts`](../backend/src/common/http/provider-timeout.ts)):
a Turso call or a Clerk call that takes more than 5 seconds fails the request
with `503` and `DATABASE_TIMEOUT` or `CLERK_TIMEOUT`. A read-only query
(`SELECT` or `WITH` without a write) that times out is sent once more first,
because Turso's first query after a quiet spell can stall for seconds; writes
are never repeated. Redis calls give up
after 250 ms ([data-model.md](data-model.md#cache-redis)). A Clerk timeout
while checking a session is a 503, never a 401, so the app does not sign the
user out. A database read that times out is retried once before failing:
Turso can take seconds to answer the first query after a short idle spell,
and the next one is fast. Writes are never retried, because the timed-out
attempt may already have been applied.
7. The frontend [`Api`](../frontend/src/app/api/api.ts) adapter validates every
   response with the zod schemas in [`api.schemas.ts`](../frontend/src/app/api/api.schemas.ts).

## Backend map (`backend/src/`)

| Path | Responsibility |
| --- | --- |
| `main.ts` | Bootstrap: validation pipe, body limits, security headers, CORS, `trust proxy` on Vercel, Swagger outside production. |
| `app.module.ts` | Registers every module and the two global middlewares. |
| `common/guards/` | Route guards (table below). |
| `common/middlewares/` | Request logging and Clerk session resolution. |
| `common/http/` | Error envelope (`api-error.ts`), CORS, hardening. |
| `common/types/` | DTOs with `class-validator` decorators; they define the OpenAPI contract. |
| `common/schemas/` | zod schemas that parse database rows. |
| `common/validators/validateEnv.ts` | Startup environment checks. |
| `common/artwork/` | Game artwork without Nest (ADR-0015): the guarded download (public http(s) only, 8 MB, 10 s) and the compression to WebP within 800 px. `backend/scripts/import-artwork.mjs` uses it too. |
| `modules/common/auth/` | Clerk token verification, account resolution, Clerk invitations, `GET /auth/clerk/status`. |
| `modules/common/database/` | `DatabaseService`: the connection, `execute`, and `transaction`. |
| `modules/common/database/queries/` | All SQL, one class per domain (`accounts`, `artwork`, `groups`, `games`, `collection`, `invitations`, `notifications`, `sessions`, `recommendations`), one method per query. |
| `modules/common/cache/` | Upstash Redis wrapper and the admin cache endpoints. |
| `modules/common/health/` | `/health` (liveness) and `/health/ready` (database, cache, schema version). |
| `modules/core/artwork` | `GET /artwork/<gameId>-<hash>.webp` (public, cached for a year) and the copying of artwork when an admin approves or edits a game. `ArtworkDownloader` is its own provider so tests answer without the network. |
| `modules/core/*` | One module per domain entity: games, tags, translations, owned games, wishlist, reviews, collection activity, game proposals, groups (`UserGroup`; `GET /groups/:groupId/collection` gives everyone's games and approximate worth), memberships, group people, invitations, notifications, meets (sessions), attendees, users. |
| `modules/features/admin` | `/admin`: the overview (work queues and catalogue counts), the catalogue (list with data-quality filters, one-request game edits with retail prices, artwork uploads), tags and categories (including merge), and game proposals (admins only). |
| `modules/features/collection` | `/collection/users/:userId/…`: private shelf, wishlist, reviews, activity. |
| `modules/features/dashboard` | `/dashboard/users/:userId/…`: stats, groups, group creation and membership management. |
| `modules/features/play` | `/play`: recommendations, recommendation feedback, play history. |
| `modules/features/profile` | `/profile/users/:userId/…`: own profile, notifications, received invitations, game proposals. |
| `modules/features/sessions` | `/sessions`: scheduled sessions, RSVP, attendance, shortlist, played games, status. Starting or finishing a session dated in the future moves its date to now; finishing with no game played needs `noGamesPlayed: true`. |
| `test/` | Backend e2e tests; `fake-clerk-token-verifier.ts` replaces Clerk and `fake-artwork-downloader.ts` the web. |

`core` modules own an entity; `features` modules compose several of them for a
screen of the app. New routes usually belong in a `features` module.

### Guards

| Guard | Purpose |
| --- | --- |
| `AuthGuard` | Requires a resolved account. Rethrows the middleware's error (for example `409 ACCOUNT_EMAIL_CONFLICT`), otherwise 401. On every controller except `health`. |
| `UserOwnershipGuard` | The `:userId` route parameter must be the caller. |
| `AdminGuard` | Requires `Account.isAdmin`. |
| `UserInGroupGuard` | The caller must be a member of `:groupId`. |
| `GroupOwnerGuard` | The caller must own `:groupId`. |
| `GroupPeopleFeatureGuard` | 404 when `BOARD_VAULT_GROUP_PEOPLE_ENABLED=false`. |
| `RateLimitGuard` | `@RateLimit(limit, seconds)` per endpoint and account (or IP when anonymous). Used on invitation and game-proposal creation. Fails open without Redis. |

List `AuthGuard` first; the others read `request.user`.

## Frontend map (`frontend/src/app/`)

| Path | Responsibility |
| --- | --- |
| `app.routes.ts` | All routes and their guards. |
| `app.config.ts` | Providers; starts Clerk once the first page has painted (`afterFirstPagePaint`). `AuthOnlyGuard`, `AdminGuard` and API tokens start it sooner if they need it (`ClerkService.whenLoaded`); public pages, `GuestOnlyGuard` included, never wait for it. |
| `api/` | `Api` (every HTTP call), zod response schemas, shared types. The schemas turn stored artwork paths (`/artwork/…`) into full addresses on the API. |
| `core/services/clerk.service.ts` | Clerk lifecycle, sign-in and sign-up modals, invitation tickets, session token. |
| `core/services/login.service.ts` | Board Vault session state: verifies Clerk sessions with `/auth/clerk/status` and loads the current user. |
| `core/services/data.service.ts` | Shared signals for the current user and loaded data. |
| `core/guards/` | `AuthOnlyGuard`, `GuestOnlyGuard`, `AdminGuard`. |
| `core/interceptors/auth.interceptor.ts` | Adds the Clerk token; on 401 signs out and redirects to `/login`. |
| `pages/` | One folder per route (landing, auth, dashboard, groups, group view, collection, games, play, sessions, settings, errors). |
| `components/` | Reusable UI: cards, modals, forms, `ui/` primitives (button, icon, dialog). |
| `layout/` | `layout-complete` (header, footer, handoff) and `layout-basic` (focused actions). |
| `modules/admin/` | Lazy-loaded admin area. |

### Shared state

Root services that hold one account's data. Each owner clears itself when
`DataService.currentUser` becomes `null` on sign-out, and loads still running
for the previous account are cancelled, so the next account starts empty
(`core/services/sign-out-state.spec.ts`).

| Owner | Holds |
| --- | --- |
| `DataService` | The current user and everything loaded for them: games, groups, invitations, notifications, reviews, sessions, history, wishlist, activity, proposals, stats. |
| `LoginService` | Whether the session is ready, the current user id, and whether they are an admin. |
| `PendingProposalsService` | The pending proposal count behind the admin badges. |
| `GroupViewService` | The open group and its member and game filters. |
| `BrowsePageService` | Catalogue search results, term, page, filters (players, length, tags, hide owned, sort) and the tag list. The page URL is the source of truth for the term and filters (`?q=&players=&length=&tags=&hideOwned=&sort=`), so a filtered view survives a reload and can be shared; filtering runs on the server. |
| `AdminGamesManageService` | Admin catalogue search results and term. |

Page state lives in the page component. Subscriptions that do not complete on
their own (router events, route params, form value changes) end with the
component through `takeUntilDestroyed` or `toSignal`.

### Routes

| Route | Guard | Page |
| --- | --- | --- |
| `/` | none | Landing |
| `/login`, `/register` | `GuestOnlyGuard` | Clerk sign-in; invitations and the private-beta notice |
| `/dashboard` | `AuthOnlyGuard` | Home: invitations, next game nights, your groups, recently played |
| `/groups/:groupId` | `AuthOnlyGuard` | Group workspace (`/groups` redirects to Home); Group pulse shows the collection's approximate worth and links to each person |
| `/groups/:groupId/members/:accountId`, `/groups/:groupId/people/:personId` | `AuthOnlyGuard` | One person in a group, with or without an account: the games they bring, their approximate collection worth (ADR-0016), and their game nights |
| `/create-group`, `/groups/:groupId/edit` | `AuthOnlyGuard` | Group create and settings (invitations) |
| `/groups/:groupId/people/:personId/claim` | `AuthOnlyGuard` | Claim a group person |
| `/groups/:groupId/sessions/new`, `/sessions/:sessionId` | `AuthOnlyGuard` | Plan and view sessions |
| `/collection`, `/collection/…` | `AuthOnlyGuard` | Collection hub (a card per subpage and recent activity); My Games, browse, reviews, wishlist, propose a game |
| `/games/:gameId` | `AuthOnlyGuard` | Game detail |
| `/play`, `/play/…` | `AuthOnlyGuard` | Play hub (a card per subpage); upcoming, recommendations, log a session, history |
| `/settings`, `/settings/profile`, `/settings/appearance`, `/settings/security` | `AuthOnlyGuard` | Settings: profile, theme, and Clerk account security (`/settings/account` redirects to profile) |
| `/admin`, `/admin/panel`, `/admin/proposals`, `/admin/proposals/:id`, `/admin/manage-games`, `/admin/manage-games/:id`, `/admin/manage-tags` | `AdminGuard` | Administration: overview (on desktop `/admin` opens it; on phones it is the list of areas), proposals and the review of one, the catalogue and the edit form of one game, tags (lazy chunk, inside the app layout) |

The app has three sections: Home (groups and their pages), Collection
(games, browse, reviews, wishlist), and Play (upcoming, what to play,
history), defined once in `layout/app-sections.ts`. Signed in, the header is
one bar: the logo (to Home), the sections (desktop), the inbox (pending group
invitations and notifications, one count), and the avatar menu (Settings,
theme, My submissions, Administration for admins, Sign out). Collection and
Play pages add their subsection tabs below it. Below `lg` the sections move
to a bottom tab bar. Header popovers use the disclosure pattern
(`core/utils/disclosure.ts`): Escape, a click outside, or a navigation closes
them.

`LayoutCompleteComponent` wraps browsing pages; `LayoutBasicComponent` wraps
focused actions (create, edit, claim, propose) without navigation.
`SidebarLayoutComponent` is the shell for areas with their own sections
(Settings, and Administration under `/admin`, which stays a lazy-loaded
chunk that only admins download): sidebar and section side by side on desktop, and on phones a
list of sections at the base route that opens each section full width.

`ThemeService` owns the colour scheme: `localStorage.theme` is `system`
(the default), `light`, or `dark`. `system` follows the OS live, and the
service keeps the `theme-color` meta tags on the theme actually shown. The
inline script in `index.html` applies the same rules before the first paint.

## Security context

- **Assets:** account records (email, username), private collections, group
  and session history, and the provider secrets in Vercel.
- **Untrusted input** enters through the browser (every API request), Clerk
  webhooks (signature-verified), invitation links, and the images an admin
  points the API at: those are downloaded only from public addresses and
  decoded and re-encoded before they are stored (ADR-0015).
- **Trust boundary:** the API. The browser only holds a Clerk session token
  and the publishable key; the API verifies the token, resolves the local
  account, and authorizes every target object ([authentication.md](authentication.md)).
- **Providers own:** credentials, sessions, and MFA (Clerk); TLS, DDoS, and
  runtime isolation (Vercel); storage encryption and backups (Turso);
  cache storage (Upstash). Board Vault owns authorization, input validation,
  and what it logs.
- Secrets live only in Vercel and the owner's password manager
  ([environments.md](environments.md)); reporting is in
  [`SECURITY.md`](../SECURITY.md).

## Contracts and decisions

- API contract: [api.md](api.md) and [`api/openapi.json`](api/openapi.json).
- Tables and relations: [data-model.md](data-model.md).
- Why things are the way they are: [ADRs](adr/README.md).
