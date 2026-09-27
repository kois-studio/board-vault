# Board Vault documentation

This directory contains documentation suitable for a public repository. It
describes product boundaries and reproducible local behavior; provider account
details, deployment identifiers, live data, credentials, and recovery contacts
belong in private operator notes.

## Start here

- [API contract](api/openapi.json)
- [Operations and local configuration](operations.md)
- [Architecture overview](architecture.md)
- [Data model](data-model.md)
- [Authentication](authentication.md)
- [User flows](ux-flows.md)
- [Architecture decision records](adr/README.md)
- [Public release checklist](release-checklist.md)
- [Database workspace](../database/README.md)

## Contribution workflow

Contributors and AI agents working on their behalf must not commit or push
directly to `main`. Create a feature or fix branch from the latest `main`,
develop and verify the change there, then open a pull request. A contributor
change may be merged only after the required CI checks pass and the pull
request receives the required review. Repository administrators may work
directly on `main` when intentionally supervising a change.

## Public documentation rules

Examples use reserved domains or clearly synthetic values. Environment files,
provider secrets, database exports, personal data, and live operational facts
must stay outside the repository. Changes that affect the API, persistence,
authentication, or privacy boundaries should update the relevant public
contract and add regression coverage.

## Local checks

The package manifests are the source of truth for commands. At minimum, run
the backend build and focused tests for a backend change, the frontend build
and tests for a frontend change, and the disposable database verification for
a migration change.
