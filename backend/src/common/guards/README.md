# Guards in `src/common/guards/`

Route guards for authentication and authorization. Clerk is the only identity
provider (ADR-0012). `ClerkSessionMiddleware` verifies the Bearer session
token, resolves the local `Account`, and attaches `request.user`
(`userId`, `email`, `isAdmin`, `clerkUserId`). Guards read that object; they
never trust Clerk claims for authorization.

List `AuthGuard` first so later guards can rely on `request.user`:

```typescript
@UseGuards(AuthGuard, UserOwnershipGuard)
@Get('/users/:userId/collection')
getCollection(@Param('userId', ParseIntPipe) userId: number) {
    // ...
}
```

Guards run in the listed order and deny access by throwing
(`UnauthorizedException`, `ForbiddenException`, or a `BoardVaultHttpException`),
which the global API error filter maps to the public error envelope.

## Available guards

| Guard | File | Purpose |
| --- | --- | --- |
| `AuthGuard` | `auth.guard.ts` | Requires a resolved account. Rethrows the middleware's resolution error (for example a 409 email conflict), otherwise returns 401. |
| `UserOwnershipGuard` | `ownership.guard.ts` | The `userId` route parameter must be the authenticated account. |
| `AdminGuard` | `admin.guard.ts` | Requires the local `Account.isAdmin` flag. |
| `UserInGroupGuard` | `user-in-group.guard.ts` | The account must be a member of the `groupId` route parameter. |
| `GroupOwnerGuard` | `group-owner.guard.ts` | The account must own the `groupId` route parameter. |
| `GroupPeopleFeatureGuard` | `group-people-feature.guard.ts` | Returns 404 when `BOARD_VAULT_GROUP_PEOPLE_ENABLED=false`. |
| `RateLimitGuard` | `rate-limit.guard.ts` | Applies the `@RateLimit()` budget per endpoint and client address. Fails open when Redis is disabled. |

Each guard has a colocated `*.spec.ts`. Add a spec for any new guard and keep
authorization decisions on local account and membership state.
