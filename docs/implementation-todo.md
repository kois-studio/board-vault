# Board Vault implementation TODO

This is the current inventory of unfinished, missing, or only partially connected product work. It is deliberately separate from [`TODO.md`](TODO.md), which tracks engineering-standards and AI-readiness gaps, and from [`/todo/`](../todo/), which contains product direction and agent task ownership.

This document records implementation truth, not wishes. A route, component, label, or TODO comment is not treated as evidence that a capability works. Findings below come from source inspection, the documented database reconciliation, the current test baseline, and the production verification recorded in [`operations.md`](operations.md).

Reviewed: 2026-08-16

## Status vocabulary

- **Open** — the capability is missing or clearly unfinished.
- **Partial** — some code or runtime behavior exists, but the complete user journey is not reliable.
- **Needs review** — implementation exists, but it has not passed a systematic product, UI/UX, accessibility, or responsive review.
- **Blocked** — meaningful implementation depends on an unresolved product, API, data, or deployment decision.
- **Verified slice** — the narrow behavior has evidence, but this does not imply that the surrounding feature is complete.

## Overall state

Board Vault has a usable technical foundation: Clerk email/password authentication is running in production, the production API/CORS path is working after the Redis recovery, the collection area is the strongest existing product slice, and the canonical session relations have been migrated into Turso.

The product is not launch-ready. The main unfinished value loop is:

```text
group → attendees → recommendation → scheduled session → games actually played → useful history
```

The session logging submission is still a TODO, recommendations are not implemented, analytics contain hardcoded/sample content, and several navigation links point to routes that do not exist.

## P0 — complete the product’s core loop

### 1. Session and play flow — Open / Partial

Relevant surfaces: [`app.routes.ts`](../frontend/src/app/app.routes.ts), [`meet-new`](../frontend/src/app/pages/meet-new/), [`meet-view`](../frontend/src/app/pages/meet-view/), [`log-session-wizard`](../frontend/src/app/components/log-session-wizard/), [`data.service.ts`](../frontend/src/app/core/services/data.service.ts).

- Replace the legacy meeting creation path with one canonical session-creation use case.
- Persist the selected date/time and timezone; the current `MeetNewComponent` form does not pass the selected date into creation.
- Persist the selected group, organizer, attendees, planned games, and session state atomically.
- Replace the `submitSession()` TODO in the log-session wizard with a real API call.
- Define session lifecycle states: scheduled, active, completed, and cancelled.
- Distinguish planned games from games actually played in both API responses and frontend types. The current frontend still exposes `playedGames` as an array of IDs while the database now has `MeetGame` state.
- Decide how the legacy `MeetAccountGame` history relation is written alongside the new session relations.
- Remove or replace the unfinished confirmation flow; `MeetConfirmComponent` already says the confirmation concept will be removed.
- Make attendee and game changes show persisted success/error state and survive refresh.
- Complete the organizer-only attendee API verification through the production UI.
- Add transaction boundaries for session creation, completion, cancellation, attendee changes, and played-game recording.
- Ensure the upcoming sessions page reads real persisted upcoming sessions rather than relying on the old meeting data shape.
- Ensure completed sessions appear in history and cancelled sessions do not appear as completed history.

### 2. Recommendations — Open / Blocked by session/product contract

Relevant intent: [`todo/04-core-product-loop.md`](../todo/04-core-product-loop.md), [`adr/0002-deterministic-explainable-recommendations.md`](adr/0002-deterministic-explainable-recommendations.md).

- Implement a backend recommendation use case and endpoint.
- Define inputs: group, attendees, available time, player count, ownership/availability, and optional preferences.
- Define deterministic filtering and scoring rules.
- Return explanations with each recommendation.
- Add a useful no-results state that explains which constraint excluded candidates.
- Add recommendation feedback and persist it for future scoring.
- Create the missing `/play/recommendations` route or remove every link that points to it until the feature exists.
- Replace recommendation claims on the landing page and play dashboard until a real flow is available.
- Resolve the indirect game-title contract: `Game` stores no title; titles are provided through `GameTranslation`.

### 3. History and analytics — Partial / Open

Relevant surfaces: [`history-page`](../frontend/src/app/pages/play-page/history-page/), [`upcoming-sessions-page`](../frontend/src/app/pages/play-page/upcoming-sessions-page/), [`dashboard-page`](../frontend/src/app/pages/dashboard-page/), [`play-page`](../frontend/src/app/pages/play-page/).

- Make personal history reflect actual persisted sessions and games played.
- Add group history and basic statistics from persisted data.
- Remove hardcoded/sample charts, counts, and analytics cards.
- Create the `/play/analytics` route or remove the dashboard link to it.
- Replace misleading counts such as group counts displayed as session counts.
- Show date, attendees, games actually played, and relevant session state.
- Make empty history actionable and honest.
- Add last-played context that can feed recommendations.
- Add simple post-session ratings or feedback when the product contract is defined.

## P1 — make existing areas reliable and coherent

### 4. Public landing page — Open

Relevant surface: [`landing.component.html`](../frontend/src/app/pages/landing/landing.component.html).

- Reconcile the product name: the page still uses both “BoardMeet” and “Board Vault”.
- Remove or label unsupported claims about recommendations, statistics, notifications, mobile apps, offline behavior, API access, billing, and integrations.
- Remove fake or unverified testimonials and social proof unless they become intentionally supported content.
- Replace pricing/plan claims with an explicit early-product posture or remove them.
- Replace placeholder `href="#"` links with real destinations or remove them.
- Ensure every primary call to action leads to an existing route and works for signed-out users.
- Review responsive layout, keyboard navigation, focus states, contrast, semantics, and performance.

### 5. Application shell and navigation — Partial / Needs review

Relevant surfaces: [`header`](../frontend/src/app/layout/header/), [`top-bar`](../frontend/src/app/layout/top-bar/), [`profile-menu`](../frontend/src/app/layout/profile-menu/), [`footer`](../frontend/src/app/layout/footer/), [`app.routes.ts`](../frontend/src/app/app.routes.ts).

- Define the final information architecture for dashboard, collection, groups, and play.
- Remove links to nonexistent routes, including recommendations, quick play, and analytics.
- Replace footer placeholder links with real routes or remove them.
- Review authenticated versus unauthenticated navigation after the Clerk migration.
- Review mobile navigation and the known admin sidebar mobile TODO.
- Standardize naming: meeting/session, play/history, group/member, and Board Vault terminology.
- Centralize loading, error, and toast behavior instead of repeating inconsistent patterns in `DataService` and pages.
- Verify keyboard access, focus visibility, labels, active states, and route transitions.

### 6. Dashboard — Partial / Needs review

Relevant surface: [`dashboard-page`](../frontend/src/app/pages/dashboard-page/).

- Replace hardcoded activity, statistics, charts, and session summaries with persisted data.
- Remove the dead “View all activity” link.
- Remove or implement the `/play/analytics` “View Full Report” link.
- Make dashboard cards represent the correct entity and count.
- Define a useful first-login empty state that guides a user to create/join a group and add games.
- Define loading, failure, and retry states for each dashboard data section.
- Review responsive layout and visual hierarchy.

### 7. Collection — Verified slice / Needs review

Relevant surfaces: [`collection-page`](../frontend/src/app/pages/collection-page/), [`game-view`](../frontend/src/app/pages/games/game-view/), collection API/service code.

- Run a complete manual journey: browse/search, add, view ownership, review, wishlist, refresh, and remove/update.
- Build the first-five-games activation flow from the existing collection primitives.
- Make search, duplicate-add, loading, empty, error, and success states coherent.
- Resolve game title/translation behavior across cards, search, proposals, history, and game detail.
- Ensure purchase metadata, wishlist priority, reviews, and tags have consistent labels and validation.
- Fix the game-detail TODO that displays `groupId` instead of a group name.
- Review responsive card grids, image fallbacks, accessible controls, and keyboard behavior.
- Add frontend response schemas in [`api.schemas.ts`](../frontend/src/app/api/api.schemas.ts).

### 8. Groups and invitations — Partial / Needs review

Relevant surfaces: [`groups`](../frontend/src/app/pages/groups/), [`group-view`](../frontend/src/app/pages/group-view/), group/invitation/notification components.

- Verify the complete two-account flow: create group, invite account, accept/reject invitation, refresh, and see membership.
- Resolve the product policy for self-join versus invite-only membership.
- Define group owner/member roles and expose only actions allowed for each role.
- Make empty groups useful: explain the next step for members, games, and invitations.
- Ensure member visibility and private group data follow the backend authorization rules.
- Remove unnecessary reload-all behavior after group mutations where safe.
- Review invitation and notification feedback, unread/read states, and failure recovery.
- Review member cards, avatars, long usernames, and mobile layouts.

### 9. Authentication, profile, and settings — Verified slice / Partial

Relevant surfaces: [`auth pages`](../frontend/src/app/pages/auth/), [`profile-menu`](../frontend/src/app/layout/profile-menu/), [`settings`](../frontend/src/app/pages/settings/), Clerk integration.

- Keep Clerk email/password/username as the production path and preserve the legacy path only as an intentional migration fallback.
- Remove or hide legacy registration/reset/verification UI if those flows are no longer supported for ordinary users.
- Define the final username policy and whether it is required at account creation.
- Replace the “Coming soon…” security settings page with Clerk account/security controls, or clearly mark the route as unavailable and remove misleading navigation.
- Review profile editing, avatar, display name, username, sign-out, and account error states.
- Ensure user-facing identity data follows the accepted privacy/DTO policy.
- Verify session-expiry and revoked-session behavior in the UI.

### 10. Game proposals and administration — Partial / Needs review

Relevant surfaces: [`propose-game-page`](../frontend/src/app/pages/collection-page/propose-game-page/), [`submissions-page`](../frontend/src/app/pages/dashboard-page/submissions-page/), [`admin`](../frontend/src/app/modules/admin/).

- Verify submitter, pending, approved, rejected, duplicate, and failure states.
- Make proposal data and game-title translations consistent with the database model.
- Review administrator authorization feedback and prevent confusing hidden/disabled action states.
- Add clear confirmation and error handling for approval, rejection, and duplicate decisions.
- Review admin tables, filters, pagination, responsive behavior, and destructive-action affordances.

## P1 — cross-cutting frontend quality

### 11. UI quality, accessibility, and responsive behavior — Open

- Perform a rendered-page review at mobile, tablet, and desktop widths.
- Test keyboard-only navigation and visible focus on primary journeys.
- Add meaningful labels and accessible names to icon-only controls.
- Audit semantic headings, form labels, errors, dialogs, tables, and live regions.
- Define consistent loading, empty, error, retry, disabled, and success states.
- Fix the Sass deprecation and selector warnings.
- Reduce the initial bundle over the configured warning budget.
- Resolve the eight current Biome findings in the form submission, log-session wizard, and proposal page.
- Resolve the known timezone/date formatting issue in `formatDate.ts`.
- Avoid mutating nested signal state in place where it can produce stale UI.
- Add shared UI conventions for buttons, cards, forms, modal behavior, spacing, typography, colors, and icons.

### 12. Frontend testing and contracts — Open

- Replace the generated single frontend smoke test with route/component/state tests for critical journeys.
- Add browser coverage for Clerk login, collection activation, group invitation, session creation, and session completion.
- Add frontend API response schemas and validate representative responses at the boundary.
- Add contract tests for frontend/backend session, collection, group, and recommendation flows.
- Add clean-environment test data and a documented two-account acceptance journey.

## P2 — backend, data, and delivery dependencies

These are not purely frontend tasks, but they block reliable product UX completion:

- Finish the session write API and transaction policy; see [`data-model.md`](data-model.md) and [`database/drift-report.md`](../database/drift-report.md).
- Establish a repeatable migration runner and empty-state recreation from the synchronized schema.
- Complete the remaining authorization, response-privacy, validation, and API-contract reviews.
- Add lockfiles, a documented Node/package-manager choice, and root development commands.
- Add CI gates for builds, tests, lint, formatting, and migrations.
- Add health/readiness checks, structured observability, backup/restore rehearsal, and rollback instructions.
- Replace the stale backend e2e starter test with product behavior tests.
- Resolve remaining backend lint failures and expand meaningful integration coverage.

## Recommended execution order

1. Remove dead routes, dead links, unsupported claims, and obviously misleading hardcoded UI.
2. Complete the canonical session API and transaction boundary.
3. Connect session creation, attendee selection, planned games, completion, and history.
4. Implement recommendations and the first-five-games collection activation flow.
5. Rework the flagship UI/UX around those stable contracts.
6. Run the responsive/accessibility pass and add browser coverage.
7. Complete launch-readiness, data-recreation, CI, and operational gates.

The agent claiming implementation work must use the task board in [`todo/06-agent-task-board.md`](../todo/06-agent-task-board.md), keep one active task, and record verification evidence before marking work complete.
