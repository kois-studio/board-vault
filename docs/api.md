# API contract

The backend is a NestJS HTTP API without a global URL prefix. Runtime Swagger
is generated from the decorated source, and the reviewed snapshot is
[`api/openapi.json`](api/openapi.json).

The Angular client uses a typed API adapter and validates responses at the
application boundary. HTTP failures use a safe envelope containing a status,
stable code, human-readable message, optional details, and a request ID.
Unexpected provider and exception details are not returned to clients.

Sensitive routes must derive the acting account from the authenticated request.
Group, collection, invitation, session, notification, and administrative
operations must authorize the target object server-side; client-supplied owner
or reviewer IDs are not authoritative.

When changing a route or DTO:

1. update the source contract and relevant response schemas;
2. regenerate and review the OpenAPI snapshot;
3. add authorization, malformed-input, and privacy regression coverage;
4. run the package checks listed in the package manifest.
