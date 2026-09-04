# Current system architecture

## Scope and confidence

This is an implementation description, not a proposed redesign. It is based on
`main` at commit `d047771` plus the uncommitted local restart work inspected on
2026-09-03. The `/todo/` documents describe intended product work and must not
be read as proof that those flows are complete. The current local branch has
not been deployed yet.

## Product shape

The repository describes Board Vault as a tabletop-game collection, group,
meeting, review, wishlist, and play-history application. The product direction
is a group-first social memory and decision layer: group creation/joining →
owned-game input → attendees → explainable recommendation → session planning →
actual play → history/feedback. The local restart work now provides a group
home, lightweight recommendation decisions, group acquisition decisions,
RSVP/attendance separation, basic post-session ratings, session notes, and
clearer planning/session surfaces. A dedicated analytics read model remains
unfinished.

## Runtime shape

```text
Browser
  Angular 19 application (frontend/)
    routes, components, pages, guards, interceptor, root DataService/API adapter
          │ Clerk or legacy bearer HTTP requests
          ▼
  NestJS 10 application (backend/)
    main.ts → AppModule → LoggerMiddleware → controllers/guards → services
          ├── Turso/libSQL SQLite via DatabaseService
          ├── Upstash Redis via CacheService (cache and auth rate limiting; explicitly disabled only in local mode)
          └── Resend via EmailService (verification and password-reset email)
```

The frontend production environment points at `https://backend.board-vault.com`; development points at `http://localhost:3000`. The backend includes a `vercel.json` Node build/routes configuration. A GitHub Actions CI workflow exists for locked installs, backend/frontend checks, public browser checks, and disposable database verification; the root `package.json` provides local workflow wrappers, but there is no Docker setup or infrastructure-as-code configuration.

## Backend boundaries

- `backend/src/main.ts` validates selected environment variables, creates the Nest app with a global strict `ValidationPipe` and `ApiErrorFilter`, applies explicit 100 KB JSON/URL-encoded body limits, baseline security headers and the configured CORS allowlist, creates runtime Swagger, and listens on `PORT` or 3000. `HealthModule` exposes dependency-free liveness and coarse dependency readiness probes.
- `backend/src/app.module.ts` imports global configuration, common modules (`auth`, `cache`, `database`, `email`, `health`), core entity modules, and feature modules; `ClerkSessionMiddleware` resolves verified Clerk sessions into the local request identity before compatibility JWT guards.
- Common modules own cross-cutting auth/cache/database/email concerns.
- The Clerk identity bridge also creates private-beta group invitations and
  consumes their server-created group context only after the invitee has a
  verified Clerk identity; public registration remains closed independently.
- Core modules own entity-oriented services such as users, groups, memberships, games, meets, invitations, reviews, tags, translations, notifications, and collection activity.
- Feature modules orchestrate cross-domain flows for admin, collection, dashboard, play, and profile.
- Controllers are mostly thin service delegators, but legacy/deprecated controllers and direct identity parameters create an inconsistent authorization surface. Operational cache endpoints are retained only behind authenticated administrator guards.
- `DatabaseService` centralizes a large raw-SQL surface over a single libSQL client. It logs parameterized SQL templates without bound values; auth/email/cache logging still needs a redaction policy.

## Frontend boundaries

The Angular application is organized into `api`, reusable `components`, `core` guards/interceptors/services/validators, `layout`, `modules/admin`, and route-level `pages`. `app.config.ts` provides the router and HTTP client with the auth interceptor. Most authenticated routes use `AuthOnlyGuard`; admin uses `AdminGuard`.

Important route families include:

- authentication: legacy `/login`, `/register`, email verification, and password reset; development Clerk sign-in/sign-up controls and the isolated `/auth/clerk/status` bridge;
- collection: `/collection`, games, browse, reviews, wishlist, proposal;
- groups: `/groups`, creation, detail, edit, leave, delete;
- play: `/play`, recommendations, log session, upcoming sessions, history;
- account and profile: dashboard, settings, notifications, invitations;
- admin: lazy-loaded `/admin` management surfaces;
- route-level page components are lazy-loaded across public, authenticated, and action flows so the public shell does not eagerly ship the whole social workspace.

The source backlog still describes `/play/quick-play`, but that route is not
declared in `app.routes.ts`. `/play/recommendations` is now an authenticated
route backed by a deterministic group-attendee recommendation read path and a
validated lightweight feedback write; bounded feedback-driven scoring is now
included, while richer preference controls and quick play remain deferred. The group route is the
current social workspace, while the Play dashboard remains a cross-group
shortcut surface. The scheduled-session form and session detail view write and
read through the canonical session API; the local UX redesign is being verified
locally before the next hosting deployment.

## Main request and data flow

1. Angular components call the root `Api`/`DataService` services.
2. The auth interceptor refreshes a Clerk session token when Clerk is the active provider, otherwise adds the stored legacy bearer token, and logs out on most 401 responses.
3. Nest controllers apply selected JWT, verified-user, ownership, group-membership, or admin guards.
4. Feature services orchestrate core services; core services call `DatabaseService` and selected cache methods.
5. Database migrations are tracked by `SchemaMigrations` and applied through the committed runner; multi-record session writes and terminal lifecycle transitions use transactions, while other legacy multi-record mutations still need review.
6. Auth registration and password-reset flows call `EmailService`, which requires `RESEND_API_KEY` during module construction.

## Current gaps that affect architecture work

- Session v1 now separates `Meet` compatibility/session records, `MeetAttendee` participant state, `MeetGame` planned/played state, and `MeetAccountGame` account-to-play links. Completed and scheduled creation, organizer lifecycle transitions, planned/played state, and per-game participant recording are implemented transactionally; richer play events and full lifecycle read models remain unfinished.
- The group home’s current insight cards are intentionally a derived read surface over completed group history; they are not a global analytics model or ranking system. A dedicated analytics route remains deferred until real usage demonstrates that the extra surface is useful.
- Recommendations and lightweight feedback are current backend capabilities,
  and the latest selected-attendee feedback is incorporated into ranking with a
  bounded explainable adjustment. Richer preference/history scoring remains
  future work.
- API routes contain deprecated and newer feature paths without a versioning/compatibility contract. The obsolete dashboard meeting-creation path has been removed; legacy meet reads and `MeetAccountGame` history writes remain as explicit compatibility boundaries around the canonical sessions API, while new scheduled-session game state uses the canonical played-games route.
- The frontend API schema file now establishes targeted runtime response validation for all current API adapter methods, including legacy invitation, attendee, and per-game played-participant writes; client-side negative coverage now includes the auth-status adapter, while future endpoints and broader malformed-response cases still require coverage.
- The backend bootstrap now installs a global strict `ValidationPipe` in addition to targeted controller pipes, and admin resource IDs use `ParseIntPipe` rather than arbitrary string coercion.

## Source evidence

- [Backend entry point](../backend/src/main.ts)
- [Nest module graph](../backend/src/app.module.ts)
- [Frontend route graph](../frontend/src/app/app.routes.ts)
- [Frontend providers](../frontend/src/app/app.config.ts)
- [Database adapter](../backend/src/modules/common/database/database.service.ts)
- [Cache adapter](../backend/src/modules/common/cache/cache.service.ts)
- [Email adapter](../backend/src/modules/common/email/email.service.ts)
- [Product and implementation backlog](../todo/00-master-brief.md)
