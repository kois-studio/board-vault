# Engineering quality and delivery workstream

## EQ-001 — establish reproducible development

- commit backend and frontend lockfiles;
- document supported Node and package-manager versions;
- add root-level commands or a documented task runner;
- add environment variable documentation without committing secrets;
- add a disposable local/test database strategy;
- add migrations to the normal development workflow.

## EQ-002 — add CI gates

CI should run, at minimum:

- backend build;
- frontend build;
- backend unit tests;
- backend integration/e2e tests;
- frontend tests;
- backend lint;
- frontend formatting/lint;
- migration validation.

Do not make CI green by suppressing failures. Fix the current lint and test-configuration problems, including the backend unit test command discovering no tests and the frontend having only a generated smoke test.

## EQ-003 — build meaningful test coverage

Prioritize tests for:

- authentication and token expiry;
- user-update privilege boundaries;
- group membership authorization;
- collection ownership;
- invitation lifecycle;
- session creation and completion transactions;
- recommendation scoring;
- empty/error states in the core frontend journey.

The current backend e2e file is still a starter `/` “Hello World” assertion. It does not validate product behavior.

## EQ-004 — stabilize API contracts

- generate or share types from the backend contract;
- define response schemas in the frontend;
- standardize singular/plural route naming;
- remove client-supplied identity from sensitive operations;
- document error shapes and pagination;
- version breaking API changes.

## EQ-005 — observability and operations

- add a health endpoint for API and database connectivity;
- add structured request IDs;
- add error monitoring;
- track authorization failures without leaking sensitive data;
- add migration and deployment checks;
- define backup and restore procedures for Turso.

## EQ-006 — frontend quality

- fix Tailwind/Sass integration warnings;
- reduce the initial bundle;
- lazy-load non-core areas;
- make loading and error states consistent;
- audit keyboard navigation and focus;
- add accessible labels to icon-only controls;
- test mobile layouts;
- model timezone explicitly for session dates.

## Definition of done

An agent is not finished when the code compiles locally. The changed behavior must be reproducible, tested, lint-clean in the affected area, observable in failure, and documented at the API/domain boundary.
