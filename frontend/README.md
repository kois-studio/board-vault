# Board Vault web client

This directory contains the Angular client. Shared public contracts and
security boundaries are documented in [`../docs/`](../docs/README.md).

## Setup

```shell
npm ci
cp .env.example .env
npm start
```

Use disposable development configuration only. Runtime configuration is
generated from explicitly supplied public browser variables; backend secrets
must never be placed in this application.

## Checks

```shell
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```
