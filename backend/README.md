# Board Vault API

NestJS API. Setup is in [`../docs/onboarding.md`](../docs/onboarding.md); the
module map is in [`../docs/architecture.md`](../docs/architecture.md).

```shell
npm run dev                          # watch mode on http://localhost:3000 (Swagger at /swagger)
npm test                             # unit tests (Vitest)
npm run test:e2e                     # e2e tests (temporary SQLite, fake Clerk), one file at a time
npm run lint:check && npm run lint:logs
npm run build && npm run docs:openapi  # regenerate ../docs/api/openapi.json
```

`/health` is liveness; `/health/ready` checks the database, cache, and schema
version.

The API is an ES module package (`"type": "module"`, `nodenext`): relative
imports end in `.js`, as Node resolves them at runtime. NestJS 12 ships only
ESM, and Vercel's runtime cannot `require()` it from a CommonJS build.
