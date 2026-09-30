# Board Vault web client

Angular app. Setup is in [`../docs/onboarding.md`](../docs/onboarding.md); the
route map is in [`../docs/architecture.md`](../docs/architecture.md#frontend-map-frontendsrcapp).

```shell
npm start                                            # http://localhost:4200
npm test -- --watch=false                            # Vitest unit tests
npm run e2e                                          # Playwright public journeys
npm run lint:check                                   # Biome
npm run build
```

There is no `.env` here. `npm start` and `npm run build` generate
`public/runtime-config.js` from `../backend/.env`; see
[`../docs/environments.md`](../docs/environments.md#frontend-configuration).
