# # Guards in `src/common/guards/`

This directory contains custom guards used for authorization and authentication in the application. Each guard enforces specific rules regarding user access to different routes.

## Important Usage Details

*   **Combining Guards:**  You can combine multiple guards on a single route using the `@UseGuards()` decorator.  The guards will be executed in the order they are listed.

    ```typescript
    @UseGuards(UserOwnershipGuard, VerifiedUserGuard)
    @Post('/:userId/sensitive-action')
    sensitiveAction(@Param('userId', ParseIntPipe) userId: number) {
      // ...
    }
    ```

    In this example, the `UserOwnershipGuard` will be executed first, followed by the `VerifiedUserGuard`.  The route will only be accessible if *both* guards pass.

*   **Guard Order Matters:** The order in which you specify the guards in the `@UseGuards()` decorator is important.  The guards are executed sequentially.  For example, if you have a guard that depends on the output of another guard, make sure to list them in the correct order.

*   **Exception Handling:**  Guards typically throw exceptions (e.g., `ForbiddenException`, `UnauthorizedException`) to indicate that access is denied.  Make sure your application handles these exceptions appropriately (e.g., by returning a 403 Forbidden or 401 Unauthorized response to the client).

*   **Testing:**  Thoroughly test your guards to ensure they are working as expected.  You can use Jest or other testing frameworks to write unit tests for your guards.  Consider mocking the `UsersService` and other dependencies to isolate the guard's logic.

## Available Guards

### 1. `UserOwnershipGuard`

*   **Purpose:**  Ensures that a user can only access or modify data that belongs to them.  It verifies that the `userId` parameter in the request matches the `userId` of the authenticated user (obtained from the JWT).
*   **Location:** `user-ownership.guard.ts`
*   **Usage:**
    *   Apply this guard to routes where users should only be able to operate on their own resources (e.g., updating their profile, deleting their account).
    *   It relies on the `request.user` object being populated by a JWT authentication strategy (e.g., `JwtStrategy`).
    *   It expects a `userId` parameter in the route path (e.g., `/users/:userId/profile`).
*   **Important Considerations:**
    *   This guard assumes that the `userId` in the JWT payload is accurate and trustworthy.
    *   Ensure that your JWT strategy correctly populates the `request.user` object with the necessary user information.
*   **Example:**

    ```typescript
    @UseGuards(UserOwnershipGuard)
    @Post('/:userId/profile')
    updateProfile(@Param('userId', ParseIntPipe) userId: number, @Body() profileData: any) {
      // ...
    }
    ```

### 2. `AdminGuard`

*   **Purpose:**  Enforces role-based access control, allowing only users with the "admin" role to access certain routes.
*   **Location:** `admin.guard.ts`
*   **Usage:**
    *   Apply this guard to routes that should only be accessible to administrators (e.g., managing user accounts, viewing system logs).
    *   It relies on the `request.user` object having a `role` property (or similar) that indicates the user's role.
    *   You'll need to define how user roles are managed and assigned in your application.
*   **Important Considerations:**
    *   The specific implementation of this guard will depend on how you store and manage user roles (e.g., in the database, in the JWT payload).
    *   Ensure that your authentication strategy correctly populates the `request.user` object with the user's role information.
*   **Example:**

    ```typescript
    @UseGuards(AdminGuard)
    @Get('/admin/users')
    getUsers() {
      // ...
    }
    ```

### 3. `VerifiedUserGuard`

*   **Purpose:**  Ensures that a user's email address has been verified before they can access certain routes.  It checks the `is_validated` property of the user record in the database.
*   **Location:** `verified-user.guard.ts`
*   **Usage:**
    *   Apply this guard to routes that require users to have verified their email address (e.g., accessing sensitive data, performing certain actions).
    *   It relies on the `request.user` object being populated by a JWT authentication strategy.
    *   It uses the `UsersService` to fetch the user record from the database and check the `is_validated` property.
*   **Important Considerations:**
    *   This guard requires access to the `UsersService` to retrieve user data.
    *   Ensure that your database schema includes an `is_validated` column (or similar) to track email verification status.
    *   Consider providing a mechanism for users to resend the verification email if they haven't received it.
*   **Example:**

    ```typescript
    @UseGuards(VerifiedUserGuard)
    @Get('/profile')
    getProfile() {
      // ...
    }
    ```

## Contributing

When adding or modifying guards, please update this README to reflect the changes.  Include a clear description of the guard's purpose, usage, and any important considerations.
