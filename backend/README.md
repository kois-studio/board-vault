# Board Vault API

This directory contains the NestJS API for Board Vault. The public API contract
is tracked in [`../docs/api/openapi.json`](../docs/api/openapi.json).

## Setup

```shell
npm ci
cp .env.example .env
npm run start:dev
```

Use disposable local provider values only. Keep `.env` files and all provider
credentials outside Git.

## Checks

```shell
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

The API exposes a dependency-free liveness endpoint at `/health`; readiness
checks may require the configured local database and optional integrations.
