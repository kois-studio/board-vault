# Add or change an API endpoint

Example: `GET /collection/users/:userId/stats` for the signed-in user.

1. **Pick the module.** Screen-oriented routes go in a `backend/src/modules/features/*`
   module; entity plumbing goes in `core/*`. See [architecture.md](../architecture.md#backend-map-backendsrc).
2. **Define the DTOs** in `backend/src/common/types/`. Request bodies use
   `class-validator` decorators (the global `ValidationPipe` rejects unknown
   fields). Response DTOs use `@ApiProperty` so they appear in the contract.
   Never return `Account` credentials or private collection data to other
   members, except for explicitly shared group spending aggregates
   ([ADR-0006](../adr/0006-user-response-privacy.md),
   [ADR-0016](../adr/0016-opt-in-group-spending-aggregates.md)).
3. **Add the SQL** as a method on the matching query class in
   `backend/src/modules/common/database/queries/` (for example
   `groups.queries.ts`); callers reach it as `databaseService.groups.<method>`.
   In unit tests, wrap flat query mocks with `fakeDatabase({...})` from
   `backend/test/fake-database.ts`. Always use parameters (`args: [...]`), never string concatenation. Name columns
   explicitly.
4. **Add the service method** that calls it, maps rows to the DTO, and
   enforces domain rules.
5. **Add the controller route.** The controller already has
   `@UseGuards(AuthGuard)`. Add the guard that authorizes the target:
   `UserOwnershipGuard` for `:userId`, `UserInGroupGuard` or `GroupOwnerGuard`
   for `:groupId`, `AdminGuard` for admin data. Take the acting account from
   `request.user.userId`, never from the body. Add `RateLimitGuard` and
   `@RateLimit(limit, seconds)` if the route sends email or creates shared
   records.
6. **Test it.** A controller spec with `Test.createTestingModule` and
   `overrideGuard(...)` (see `profile.controller.spec.ts`) for validation, plus
   a service spec for the rules. Cover: unauthorized caller, malformed input,
   and that private fields don't leak.
7. **Regenerate the contract** and commit it with the change:

   ```shell
   cd backend
   npm run build
   npm run docs:openapi
   git diff ../docs/api/openapi.json
   ```

8. **Use it in the frontend**: add a method to `frontend/src/app/api/api.ts`
   and a zod schema in `api.schemas.ts` that parses the response.

Checks: `npm run lint`, `npm run test:unit`, `npm run build`.
