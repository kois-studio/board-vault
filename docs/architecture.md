# Current system architecture

## Scope and confidence

This is an implementation description, not a proposed redesign. It is based on `main` at commit `4a84c2e` and source/configuration inspection on 2026-08-15. The `/todo/` documents describe intended product work and must not be read as proof that those flows are complete.

## Product shape

The repository describes Board Vault as a tabletop-game collection, group, meeting, review, wishlist, and play-history application. The current strongest implementation area is collection management. The product brief identifies the intended flagship loop as group creation/joining → owned-game input → attendees → recommendation → session scheduling/logging → history/feedback; recommendation and robust session planning remain unfinished.

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

The frontend production environment points at `https://backend.board-vault.com`; development points at `http://localhost:3000`. The backend includes a `vercel.json` Node build/routes configuration. No CI workflow, Docker setup, root task runner, or infrastructure-as-code configuration was found.

## Backend boundaries

- `backend/src/main.ts` validates selected environment variables, creates the Nest app with explicit 100 KB JSON/URL-encoded body limits, applies baseline security headers and the configured CORS allowlist, creates runtime Swagger, and listens on `PORT` or 3000.
- `backend/src/app.module.ts` imports global configuration, common modules (`auth`, `cache`, `database`, `email`), core entity modules, and feature modules; `ClerkSessionMiddleware` resolves verified Clerk sessions into the local request identity before compatibility JWT guards.
- Common modules own cross-cutting auth/cache/database/email concerns.
- Core modules own entity-oriented services such as users, groups, memberships, games, meets, invitations, reviews, tags, translations, notifications, and collection activity.
- Feature modules orchestrate cross-domain flows for admin, collection, dashboard, play, and profile.
- Controllers are mostly thin service delegators, but legacy/deprecated controllers and direct identity parameters create an inconsistent authorization surface.
- `DatabaseService` centralizes a large raw-SQL surface over a single libSQL client. It logs parameterized SQL templates without bound values; auth/email/cache logging still needs a redaction policy.

## Frontend boundaries

The Angular application is organized into `api`, reusable `components`, `core` guards/interceptors/services/validators, `layout`, `modules/admin`, and route-level `pages`. `app.config.ts` provides the router and HTTP client with the auth interceptor. Most authenticated routes use `AuthOnlyGuard`; admin uses `AdminGuard`.

Important route families include:

- authentication: legacy `/login`, `/register`, email verification, and password reset; development Clerk sign-in/sign-up controls and the isolated `/auth/clerk/status` bridge;
- collection: `/collection`, games, browse, reviews, wishlist, proposal;
- groups: `/groups`, creation, detail, edit, leave, delete;
- play: `/play`, log session, upcoming sessions, history;
- account and profile: dashboard, settings, notifications, invitations;
- admin: lazy-loaded `/admin` management surfaces.

The source backlog still describes `/play/recommendations` and `/play/quick-play`, but those routes are not declared in `app.routes.ts`; current navigation uses an explicit coming-soon recommendation card and existing session routes. The Play dashboard no longer presents fabricated sample content, and the log-session wizard writes through the canonical session API.

## Main request and data flow

1. Angular components call the root `Api`/`DataService` services.
2. The auth interceptor refreshes a Clerk session token when Clerk is the active provider, otherwise adds the stored legacy bearer token, and logs out on most 401 responses.
3. Nest controllers apply selected JWT, verified-user, ownership, group-membership, or admin guards.
4. Feature services orchestrate core services; core services call `DatabaseService` and selected cache methods.
5. Database writes are individual calls; there is no migration runner or documented transaction boundary.
6. Auth registration and password-reset flows call `EmailService`, which requires `RESEND_API_KEY` during module construction.

## Current gaps that affect architecture work

- Session v1 now separates `Meet` compatibility/session records, `MeetAttendee` participant state, `MeetGame` planned/played state, and `MeetAccountGame` account-to-play links. Completed and scheduled creation, organizer lifecycle transitions, and the planned/played distinction are implemented transactionally; richer play events, editing, and full lifecycle read models remain unfinished.
- Recommendations and feedback are product backlog work, not a current backend capability.
- API routes contain deprecated and newer feature paths without a versioning/compatibility contract.
- The frontend API schema file is explicitly unfinished; runtime response validation is not established.
- The current backend e2e test expects a `/` “Hello World” response even though there is no root controller in the inspected module graph.

## Source evidence

- [Backend entry point](../backend/src/main.ts)
- [Nest module graph](../backend/src/app.module.ts)
- [Frontend route graph](../frontend/src/app/app.routes.ts)
- [Frontend providers](../frontend/src/app/app.config.ts)
- [Database adapter](../backend/src/modules/common/database/database.service.ts)
- [Cache adapter](../backend/src/modules/common/cache/cache.service.ts)
- [Email adapter](../backend/src/modules/common/email/email.service.ts)
- [Product and implementation backlog](../todo/00-master-brief.md)
