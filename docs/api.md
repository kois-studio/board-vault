# API surface and contracts

## Current interface

The backend is an HTTP NestJS API with no global prefix. `main.ts` creates runtime Swagger at `/swagger` using `@nestjs/swagger`, bearer auth metadata, and decorated DTOs. The API is consumed by the Angular client through the `Api` service and `DataService`; the production frontend environment targets `https://backend.board-vault.com`.

The runtime Swagger document is generated from source. There is no committed versioned OpenAPI artifact, generated client, consumer-driven contract, or contract-test gate.

## Route families observed

| Area | Representative paths | Boundary notes |
|---|---|---|
| Auth | `/auth/status`, `/auth/register`, `/auth/login`, email verification, password reset | Public and authenticated paths are mixed; reset and enumeration behavior needs review. |
| Users/profile | `/users/*`, `/profile/users/:userId/*` | User-scoped profile reads and the deprecated single-user lookup require ownership; invitation acceptance requires the authenticated user to be the invitation recipient. |
| Collection | `/collection/users/:userId/*` | Feature controller applies JWT/verified guards and ownership across the current-user collection routes; broader group/object policy remains incomplete. |
| Dashboard/groups | `/dashboard/users/:userId/*`, `/groups/*`, `/memberships/*` | Dashboard group routes check user ownership/membership; legacy group routes check membership/ownership, invitation/membership creation derives the actor from JWT, and invitation lifecycle actions check sender/recipient ownership. All-group and group-join policy remain under review. |
| Meets/play | `/meets/*`, `/meetAccountGames/*`, `/play/users/:userId/*` | User history now requires ownership; legacy meet/account-game routes still need object-level review. Planned session creation is unfinished. |
| Admin | `/admin/*` | Controller uses JWT, verified-user, and admin guards; reviewer identity still has TODOs. |
| Cache | `/cache/print`, `/cache/reset`, `/cache/delete/:key` | Operationally sensitive endpoints are present in the application module graph and require explicit exposure review. |

The list is intentionally representative rather than a second route registry. The source controllers and Swagger output are authoritative for exact routes.

## Contract findings

- `ParseIntPipe` is used on selected route parameters, but `main.ts` does not install a global `ValidationPipe` for bodies, query parameters, and DTOs.
- `frontend/src/app/api/api.schemas.ts` explicitly contains a TODO to define response schemas, so client response validation is not implemented.
- Error shape, compatibility policy, deprecation policy, pagination limits, and retry/idempotency behavior are not documented as stable contracts.
- Pagination helpers exist (`limit.pipe.ts`, `offset.pipe.ts`) and some admin operations are paginated, but maximum bounds and expensive-query behavior are not consistently evidenced.
- The admin controller has TODOs to derive reviewer identity from JWT; sensitive operations must not trust client-supplied reviewer IDs.
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
