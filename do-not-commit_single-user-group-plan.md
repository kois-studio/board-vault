# Single-user group / placeholder participant implementation plan

This file is the working implementation checklist for changing Board Vault from
an account-first group model to an organizer-first model. It intentionally stays
uncommitted until every implementation item is complete.

## Product decision

Board Vault must allow one real account, such as Carlos, to create a group and
represent other people without requiring those people to register. Those people
are group-scoped participant profiles, not fake `Account` rows. They can own
games, have preferences, attend sessions, and appear in history. Later, a real
account may claim one participant profile and continue its history.

The identity boundary is:

- `Account`: authentication, private account data, and authorization identity.
- `GroupMembership`: access authorization for real accounts.
- `GroupPerson`: a person represented in one group, either placeholder or linked
  to a real account.

Placeholder data is group data entered by an authorized group member. Claiming
it must offer the future member a review step; it must not silently write into
their private collection. Historical sessions must retain the same stable
`GroupPerson` identity after claiming.

## Current implementation constraints

- Keep existing `Account`, `GroupMembership`, `OwnedGame`, and legacy session
  contracts working during migration.
- Use additive numbered database migrations; never edit live Turso manually.
- Derive acting account IDs from the authenticated request.
- Keep group and participant authorization server-side.
- Preserve `Meet*` names only at compatibility/persistence boundaries.
- Do not create synthetic accounts for placeholders.
- Do not make the checklist itself part of intermediate commits.

## Implementation checklist

### 0. Product and architecture contract

- [x] 0.1 Record the `GroupPerson`/`Account`/`GroupMembership` boundary in a new ADR.
- [x] 0.2 Decide and document user-facing terminology: use “group person” or “guest” rather than “mock account”.
- [x] 0.3 Define placeholder permissions: owner creates/edits/archives; group members can view and use them.
- [x] 0.4 Define group-local identity rules, duplicate-name behavior, and one-linked-person-per-account-per-group.
- [x] 0.5 Define leave, deletion, unlink, and account-deletion behavior without losing group history.
- [x] 0.6 Define ownership provenance and the difference between group assertions and private account collection data.
- [x] 0.7 Decide the invitation branches: claim an existing placeholder or join as a new group person.

### 1. Database model and migration

- [x] 1.1 Add the `GroupPerson` table with nullable linked `accountId`, group scope, display data, status, provenance, and timestamps.
- [x] 1.2 Add uniqueness/index rules for group scope, linked account scope, and common participant queries.
- [x] 1.3 Add group-person game ownership assertions with source/provenance and review state.
- [x] 1.4 Add group-person game preferences with explicit favorite/like/neutral/avoid semantics.
- [x] 1.5 Add a canonical group invitation/claim table or additive target columns for placeholder claims.
- [x] 1.6 Add participant identity columns/tables for session attendance and per-game participation.
- [x] 1.7 Add participant identity support for recommendation context and feedback.
- [x] 1.8 Write a numbered migration with backfill for every existing real group member.
- [x] 1.9 Verify the migration from an empty database and a representative existing database.
- [x] 1.10 Update the schema snapshot, migration notes, and data-model documentation.

### 2. Backend participant foundation

- [x] 2.1 Add typed DTOs, schemas, response projections, and enums for group persons.
- [x] 2.2 Add a backend participant service/repository boundary over `DatabaseService`.
- [x] 2.3 Implement owner-authorized create, update, archive, and restore operations.
- [x] 2.4 Implement group-scoped participant reads with public linked-account projections only.
- [x] 2.5 Implement ownership assertion add/remove/update operations.
- [x] 2.6 Implement preference add/remove/update operations.
- [x] 2.7 Ensure all actor IDs come from the authenticated request, never the request body.
- [x] 2.8 Add authorization tests for owner, member, non-member, cross-group, archived, and linked-person cases.
- [x] 2.9 Add validation tests for names, IDs, arrays, preference values, and request-size boundaries.

### 3. Group and collection integration

- [x] 3.1 Return real and placeholder people through one group participant read model.
- [x] 3.2 Preserve the current personal collection routes for authenticated accounts.
- [x] 3.3 Add group-person collection endpoints for organizer-entered ownership assertions.
- [x] 3.4 Make group library reads distinguish personal ownership, asserted ownership, and disputed/rejected data.
- [x] 3.5 Add clear provenance labels and corrections in the group UI/API.
- [x] 3.6 Ensure archive/removal does not delete historical participant references.

### 4. Recommendation and acquisition integration

- [x] 4.1 Accept participant IDs in the canonical recommendation request while retaining a compatibility adapter for account IDs.
- [x] 4.2 Validate every selected participant belongs to the target group and is active.
- [x] 4.3 Compute eligible games from selected participant ownership assertions and real-account collections.
- [x] 4.4 Incorporate explicit group-person preferences into deterministic scoring.
- [x] 4.5 Update recommendation explanations to name the participant ownership/preference signals safely.
- [x] 4.6 Update feedback persistence and reads to use participant context while retaining the real actor account.
- [x] 4.7 Decide and implement participant-aware acquisition interest, without confusing it with personal wishlist data.
- [x] 4.8 Add unit and contract tests for mixed real/placeholder recommendations and no-result explanations.

### 5. Session, play, and history integration

- [x] 5.1 Allow mixed real and placeholder participants in completed-session creation.
- [x] 5.2 Allow mixed real and placeholder participants in scheduled-session creation.
- [x] 5.3 Keep RSVP available only to linked real accounts; organizer attendance remains authoritative for placeholders.
- [x] 5.4 Record placeholder and real participants for each played game.
- [x] 5.5 Preserve existing sessions through a safe participant backfill/compatibility read path.
- [x] 5.6 Make session detail, group history, personal history, and insights resolve participant names correctly.
- [x] 5.7 Preserve stable participant identity when a placeholder is claimed.
- [x] 5.8 Add transactional and stale-write tests for participant/session mutations.
- [x] 5.9 Add mixed-participant frontend/backend contract tests.

### 6. Frontend organizer experience

- [x] 6.1 Add participant management to the group workspace.
- [x] 6.2 Support creating, naming, editing, archiving, and restoring placeholder people.
- [x] 6.3 Add a per-person ownership editor with clear source/provenance and correction controls.
- [x] 6.4 Add a per-person preference editor.
- [x] 6.5 Show linked versus placeholder status without exposing private account data.
- [x] 6.6 Update attendee selectors to support mixed participant types.
- [x] 6.7 Update recommendation controls and explanations for mixed participants.
- [x] 6.8 Update session logging, scheduling, attendance, and per-game participant controls.
- [x] 6.9 Update group history and insight cards to render participant identities.
- [x] 6.10 Cover loading, empty, validation, failure, retry, mobile, keyboard, and screen-reader states.

### 7. Invitation and claim flow

- [x] 7.1 Extend Clerk/provider invitation metadata with an optional target `groupPersonId`.
- [x] 7.2 Extend existing-account invitations with a placeholder target.
- [x] 7.3 Ensure invitation creation is owner-authorized and target-group validated.
- [x] 7.4 Implement the invitee choice: claim the targeted person or join as a new person.
- [x] 7.5 Implement an atomic, idempotent claim operation.
- [x] 7.6 Create a new linked person atomically for the “join as new member” branch.
- [x] 7.7 Build the prefill/review screen for ownership and preference data.
- [x] 7.8 Support per-item removal before adoption and optional private collection import.
- [x] 7.9 Preserve all historical sessions and participant references after claim.
- [x] 7.10 Handle expired, revoked, reused, wrong-email, duplicate, and unavailable-group cases.
- [x] 7.11 Add provider, backend, frontend, and browser tests for both invitation branches.

### 8. Compatibility, operations, and quality

- [x] 8.1 Keep legacy account-based endpoints working through participant adapters or deprecation boundaries.
- [x] 8.2 Update OpenAPI, frontend response schemas, and API error contracts.
- [x] 8.3 Add feature-flag/rollout protection and a reversible deployment plan.
- [x] 8.4 Add migration backup/restore rehearsal, rollback procedure, and live-schema verification runbook.
- [x] 8.5 Add authorization, privacy, malformed-input, and account-deletion regression coverage.
- [x] 8.6 Run backend build, unit, HTTP E2E, lint, log audit, and migration verification.
- [x] 8.7 Run frontend build, browser unit tests, Biome, and document the authenticated browser journey gate.
- [x] 8.8 Update architecture, data model, API, security, authentication, UX, testing, and product TODO documentation.
- [x] 8.9 Update the production acceptance guide with the single-user group journey.
- [x] 8.10 Review the finished flow against the 0%–100% acceptance criteria below.

## 100% acceptance criteria

- [x] Carlos can register, create a group, and add at least three placeholder people without those people registering.
- [x] Carlos can configure each person’s games and preferences, then refresh without data loss.
- [x] Carlos can receive recommendations based on a mixed selection of real and placeholder participants.
- [x] Carlos can schedule and complete a session with mixed participants and record per-game participants.
- [x] History and insights retain the correct participant identities after refresh.
- [x] A future user can claim the intended placeholder through an invitation.
- [x] The future user can review, deselect, and correct imported group data.
- [x] The future user can optionally import selected games into their private collection.
- [x] Claiming preserves all historical sessions without rewriting or duplicating them.
- [x] Joining as a new member does not inherit the placeholder’s history or data.
- [x] Unauthorized users cannot read or mutate placeholder data.
- [x] Existing real-account groups continue working throughout the migration.
- [x] Empty-state, loading, error, retry, accessibility, mobile, migration, and rollback evidence/procedures are documented.
- [x] All checklist items above are checked and the final plan file is committed.

## Release-boundary note

All repository implementation items and local verification gates are complete. Applying migrations to live Turso, provider email/CAPTCHA delivery, and credentialed authenticated browser acceptance remain deployment-owner actions documented in `docs/operations.md`, `docs/testing.md`, and `docs/production-test-guide.md`; this workspace did not claim or mutate those external systems.
