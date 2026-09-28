# Architecture overview

Board Vault is a browser client backed by a NestJS HTTP API and a SQLite/libSQL
database adapter.

```text
Angular browser
    │ HTTP + safe response schemas
    ▼
NestJS API
    ├── authentication and authorization
    ├── groups, collections, recommendations, and sessions
    ├── provider adapters for identity, email, and cache
    └── parameterized database service
             ▼
       SQLite/libSQL database
```

The backend is authoritative for authentication, authorization, validation,
privacy, and persistence. Browser guards and hidden controls are UX aids, not
security boundaries. Provider secret keys and database credentials are backend
configuration; browser configuration is limited to values explicitly designed
to be public.

Database changes use numbered migrations. Multi-record domain operations define
transaction and authorization boundaries in the service layer. The API emits
safe errors with correlation identifiers and does not expose SQL, provider
payloads, credentials, or stack traces.

The frontend uses route-level Angular features and a hand-written API adapter
with response validation. The backend publishes a machine-readable contract in
[`api/openapi.json`](api/openapi.json). Package manifests and tests are the
source of truth for supported local commands.
