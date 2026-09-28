# Authentication boundaries

Board Vault supports a managed identity-provider session and a compatibility
legacy session during migration. The backend resolves the authenticated
identity before protected services run. Local account authorization state
remains authoritative for administrator and group access.

The main state transitions are:

1. an unauthenticated visitor reaches the public shell;
2. the identity provider or compatibility login establishes a session;
3. the backend verifies the session and links or provisions the local account
   under the registration policy;
4. protected routes load only data authorized for that account;
5. sign-out clears the client session and returns to the public shell.

Provider failures, incomplete account linking, expired sessions, and network
errors must produce actionable retry/sign-out states without exposing provider
payloads, tokens, or account-enumeration details.

Secret keys belong in private backend configuration. Publishable browser values
must be supplied through runtime configuration and must never be confused with
backend credentials.
