# Board Vault documentation

Public, current-state documentation. Credentials, live data, and private
operating procedures are not kept here.

## Start here

- [Onboarding](onboarding.md): clean clone to running app
- [Agent and contributor instructions](AGENTS.md): routing table, hard rules, checks
- [Work queue: GitHub Issues](https://github.com/kois-studio/board-vault/issues)

## How the system works

- [Architecture](architecture.md): module, route, and guard maps
- [Authentication](authentication.md): Clerk-only sign-in and account resolution
- [Data model](data-model.md): tables, relations, deletion rules
- [API contract](api.md) and [OpenAPI snapshot](api/openapi.json)
- [Environments](environments.md): every environment and variable
- [User flows](ux-flows.md), [design system](design-system.md), [glossary](glossary.md)

## How to

- [Add or change an endpoint](how-to/add-endpoint.md)
- [Add a database migration](how-to/add-migration.md)
- [Add a page](how-to/add-page.md)
- [Run with Clerk](how-to/run-with-clerk.md)
- [Run with local Redis](how-to/run-with-redis.md)
- [Update Playwright screenshots](how-to/update-screenshots.md)

## Decisions and governance

- [Architecture decision records](adr/README.md)
- [Standards contract](project-standards.yml)
- [Public release checklist](release-checklist.md)
- [Changelog](../CHANGELOG.md)
