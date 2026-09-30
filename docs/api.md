# API contract

The backend is a NestJS HTTP API without a global URL prefix. Runtime Swagger
is generated from the decorated source, and the reviewed snapshot is
[`api/openapi.json`](api/openapi.json).

The Angular client uses a typed API adapter and validates responses at the
application boundary. HTTP failures use a safe envelope containing a status,
stable code, human-readable message, optional details, and a request ID.
Unexpected provider and exception details are not returned to clients.

The committed snapshot is a review artifact, not a second source of truth. CI
builds the backend with disposable local provider values, regenerates the
snapshot, and fails if the generated contract differs from `api/openapi.json`.

Sensitive routes must derive the acting account from the authenticated request.
Group, collection, invitation, session, notification, and administrative
operations must authorize the target object server-side; client-supplied owner
or reviewer IDs are not authoritative.

## Compatibility

The frontend and the API deploy as separate Vercel projects, so for a few
minutes an old client can talk to a new API, and the reverse. The API has no
URL versioning; instead every change must work with the previous release of
the other side:

- add fields, routes, and optional inputs freely;
- to remove or rename, ship the replacement first, move the frontend to it,
  and remove the old one in a later release;
- never change the meaning or type of an existing field in place.

Endpoints consumed by third parties (today only the Clerk webhook) follow the
provider's contract.

## Collections

Catalogue browsing and admin listings are paginated with a maximum page size
enforced in the DTO. Per-account and per-group lists (collection, wishlist,
members, sessions) are bounded by their owner and returned whole.

## Changing a route or DTO

1. update the source contract and relevant response schemas;
2. regenerate and review the OpenAPI snapshot;
3. add authorization, malformed-input, and privacy regression coverage;
4. run the package checks listed in the package manifest.
