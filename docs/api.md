# API surface and contracts

## Current interface

The backend is an HTTP NestJS API with no global prefix. `main.ts` creates runtime Swagger at `/swagger` using `@nestjs/swagger`, bearer auth metadata, and decorated DTOs. The API is consumed by the Angular client through the `Api` service and `DataService`; the production frontend environment targets `https://backend.board-vault.com`.

The runtime Swagger document is generated from source. There is no committed versioned OpenAPI artifact, generated client, consumer-driven contract, or contract-test gate.

## Route families observed

| Area | Representative paths | Boundary notes |
|---|---|---|
| Auth | `/auth/status`, `/auth/register`, `/auth/login`, email verification, password reset | Public and authenticated paths are mixed; login, registration, password-reset, availability-query, and legacy token path inputs now use strict targeted validation and route-specific rate limits, forgot-password returns the same success behavior for known and unknown emails, and verification/reset tokens have persisted expiry and one-time-use enforcement; broader DTO validation remains unresolved. |
| Users/profile | `/users/*`, `/profile/users/:userId/*` | The deprecated global `GET /users/` listing is administrator-only; user-scoped profile reads and the deprecated single-user lookup require ownership; `PUT /users/:userId` uses strict nested DTO validation and rejects privileged/unknown fields; `PUT /users/:userId/games` validates positive integer game-ID arrays and rejects unknown fields; `POST /profile/users/:userId/proposals` validates typed proposal fields and non-negative integer duration/player values; invitation acceptance requires the authenticated user to be the invitation recipient. Self-profile responses use the private user shape, while nested group/invitation/play identities use only `id`, `username`, `displayName`, and `avatar`. |
| Collection | `/collection/users/:userId/*` | Feature controller applies JWT/verified guards and `UserOwnershipGuard` to every current collection read and mutation route, including activity, owned games, wishlist, and reviews; review writes now require an integer score from 0 through 10 and reject unknown fields. Response validation and broader API-contract work remain incomplete. |
| Dashboard/groups | `/dashboard/users/:userId/*`, `/groups/*`, `/memberships/*` | Dashboard group routes check user ownership/membership; deprecated group listing is limited to owned/member groups, membership listing is limited to the authenticated account, legacy group creation derives the creator from JWT, other legacy group routes check membership/ownership, invitation lifecycle actions check sender/recipient ownership, and deprecated membership creation requires a pending invitation. Broader group-join policy remains open. |
| Notifications | `/notifications/*`, `/profile/users/:userId/notifications` | Profile reads require user ownership; deprecated notification list, ID reads, creation, read-state updates, and deletes now derive or enforce the authenticated account. |
| Meets/play | `/meets/*`, `/meetAccountGames/*`, `/play/users/:userId/*` | User history requires ownership; legacy meet lists/details are limited to group members; meet-account-game create/delete derives the account from JWT and requires meet-group membership. Planned session creation remains unfinished. |
| Admin | `/admin/*` | Controller uses JWT, verified-user, and admin guards; administrator catalog and proposal-review bodies use strict targeted validation; proposal approval, rejection, and duplicate actions derive reviewer identity from the JWT. |
| Cache | `/cache/print`, `/cache/reset`, `/cache/delete/:key` | Operationally sensitive endpoints are present in the application module graph and require explicit exposure review. |

The list is intentionally representative rather than a second route registry. The source controllers and Swagger output are authoritative for exact routes.

## Contract findings

- `ParseIntPipe` is used on selected route parameters, but `main.ts` does not install a global `ValidationPipe` for bodies, query parameters, and DTOs. The bootstrap does apply an explicit 100 KB JSON/URL-encoded body limit; route-level request validation remains incomplete.
- `frontend/src/app/api/api.schemas.ts` explicitly contains a TODO to define response schemas, so client response validation is not implemented.
- Error shape, compatibility policy, deprecation policy, pagination limits, and retry/idempotency behavior are not documented as stable contracts.
- Pagination helpers exist (`limit.pipe.ts`, `offset.pipe.ts`) and some admin operations are paginated, but maximum bounds and expensive-query behavior are not consistently evidenced.
- Proposal review operations derive reviewer identity from the JWT; the frontend no longer sends reviewer query parameters.
- Nested user response fields are intentionally narrower than self-profile/admin fields; `UserPublicDto` is the documented public identity shape. Response validation and a complete DTO inventory remain open.
- Multiple controllers mark endpoints deprecated without a migration/versioning contract.

## Effective rules for API changes

- Add or update the machine-readable contract with any externally consumed route change.
- Validate path, query, body, and response boundaries; reject malformed, oversized, unexpected, or unauthorized input before application logic.
- Use a stable safe error envelope. Never expose stack traces, secrets, formatted SQL, or provider credentials.
- Define maximum collection sizes and query limits.
- Define duplicate/retry behavior for every mutation that can be repeated by the client or network.
- Add endpoint/contract tests for permitted and denied paths before marking a task complete.

## Source evidence

- [Backend bootstrap and Swagger](../backend/src/main.ts)
- [Representative user routes](../backend/src/modules/core/users/users.controller.ts)
- [Representative group routes](../backend/src/modules/core/groups/groups.controller.ts)
- [Admin routes](../backend/src/modules/features/admin/admin.controller.ts)
- [Frontend API adapter](../frontend/src/app/api/api.ts)
- [Frontend response schema TODO](../frontend/src/app/api/api.schemas.ts)
- [Quality backlog](../todo/05-engineering-quality-and-delivery.md)
