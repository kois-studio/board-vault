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

Completed-session logging now has a guarded, validated backend write and an atomic Turso transaction from the frontend wizard. The first recommendation and feedback slices are implemented, while analytics and richer scoring remain unfinished; the dashboard and play landing avoid presenting fabricated metrics or links to unavailable feature routes.

## P0 — complete the product’s core loop

### 1. Session and play flow — Partial

Relevant surfaces: [`app.routes.ts`](../frontend/src/app/app.routes.ts), [`meet-new`](../frontend/src/app/pages/meet-new/), [`meet-view`](../frontend/src/app/pages/meet-view/), [`log-session-wizard`](../frontend/src/app/components/log-session-wizard/), [`data.service.ts`](../frontend/src/app/core/services/data.service.ts).

- Replace the legacy meeting creation path with one canonical session-creation use case for all session states; scheduled and completed creation now use the sessions module, while the old route remains only as a compatibility path.
- Persist the selected date/time and IANA timezone; completed-session logging now sends both to the backend.
- Persist the selected group, organizer, attendees, played games, and participant links atomically through `POST /sessions`.
- Persist scheduled sessions, selected pending attendees, and optional planned games atomically through `POST /sessions/scheduled`; omission of attendees remains a documented compatibility default to all current group members.
- Review the now-implemented `submitSession()` flow through authenticated browser coverage, including success, validation, and retryable API failure states.
- Define and implement transitions between scheduled, active, completed, and cancelled sessions; organizer-controlled transitions now exist for scheduled/active sessions, while completed/cancelled remain terminal.
- Distinguish planned games from games actually played in all API responses and frontend types; scheduled creation and meet details now preserve planned, played, and skipped game IDs. When a session becomes completed or cancelled, remaining planned games are transactionally marked skipped; richer game objects and planned-game editing remain unfinished.
- Decide how the legacy `MeetAccountGame` history relation should evolve; the completed write currently preserves it as a compatibility relation.
- The obsolete confirmation flow has been removed; attendee and played-game changes now state that they save automatically from the session detail page.
- Attendee and played-game changes now await the API, disable overlapping/terminal edits, show actionable errors, and revert optimistic UI state when persistence fails; refresh-survival still needs an authenticated browser journey.
- Complete the organizer-only attendee API verification through the production UI.
- Add transaction boundaries for scheduled-session creation, completion, cancellation, attendee changes, and played-game recording; completed-session logging and played-game recording now have transaction boundaries, while attendee mutations remain single-row writes.
- Ensure the upcoming sessions page reads real persisted scheduled/active sessions; the old completed-history placeholder has been removed and the page now uses `userMeets`.
- Ensure completed sessions appear in history and cancelled sessions do not appear as completed history; lifecycle filtering now excludes cancelled sessions from upcoming, while richer history/status read models remain to be completed.

### 2. Recommendations — Verified slice / Partial

Relevant intent: [`todo/04-core-product-loop.md`](../todo/04-core-product-loop.md), [`adr/0002-deterministic-explainable-recommendations.md`](adr/0002-deterministic-explainable-recommendations.md).

- Implemented `POST /play/recommendations` with group membership and attendee validation.
- Defined inputs: group, selected attendees, and optional available time; player count is derived from attendees.
- Implemented deterministic filtering and scoring using player count, collective attendee ownership, selected-attendee ratings, and optional duration fit.
- Return explanations with each recommendation, including owner coverage, rating, and last-play context.
- No-results responses now identify whether selected attendees own no games, player-count constraints exclude them, or the available-time limit excludes them.
- Added `POST /play/recommendations/feedback` and a “Not for us” action. Feedback stores selected-attendee context after group membership and ownership validation; future scoring integration remains deferred.
- Added the authenticated `/play/recommendations` route, Play navigation entry, selection form, result cards, and empty/error states.
- Recommendation results now provide a direct scheduling link that carries the selected attendees and chosen game into the scheduling form.
- Add authenticated browser coverage when a Clerk storage state is available; the test is present but skipped without that local secret-bearing state.
- Recommendation feedback, richer preferences, complexity scoring, and history-weighted scoring remain deferred.
- Resolve the indirect game-title contract: `Game` stores no title; titles are provided through `GameTranslation`. The recommendation query uses English with Spanish fallback.

### 3. History and analytics — Partial / Open

Relevant surfaces: [`history-page`](../frontend/src/app/pages/play-page/history-page/), [`upcoming-sessions-page`](../frontend/src/app/pages/play-page/upcoming-sessions-page/), [`dashboard-page`](../frontend/src/app/pages/dashboard-page/), [`play-page`](../frontend/src/app/pages/play-page/).

- Make personal history reflect actual persisted sessions and games played; history and upcoming-session loading failures now have explicit retry states instead of being presented as empty data.
- Add group history and basic statistics from persisted data.
- Remove any remaining hardcoded/sample charts, counts, and analytics cards as those surfaces are implemented; the dashboard and play landing cleanup is complete for the currently identified fabricated content.
- Create the `/play/analytics` route or remove the dashboard link to it.
- Replace misleading counts such as group counts displayed as session counts.
- Show date, attendees, games actually played, and relevant session state.
- Make empty history actionable and honest.
- Add last-played context that can feed recommendations.
- Add simple post-session ratings or feedback when the product contract is defined.

## P1 — make existing areas reliable and coherent

### 4. Public landing page — Partial / Needs review

Relevant surface: [`landing.component.html`](../frontend/src/app/pages/landing/landing.component.html).

- Keep the product name consistently as “Board Vault”.
- Keep unsupported recommendations, statistics, notifications, mobile apps, offline behavior, API access, billing, and integrations out of the public claims until implemented.
- Keep testimonials, social proof, and pricing out of the public surface until they become intentionally supported content.
- Ensure every primary call to action leads to an existing route and works for signed-out users.
- Keep the Playwright public-navigation checks updated when the public information architecture changes.
- Review responsive layout, keyboard navigation, focus states, contrast, semantics, and performance.

### 5. Application shell and navigation — Partial / Needs review

Relevant surfaces: [`header`](../frontend/src/app/layout/header/), [`top-bar`](../frontend/src/app/layout/top-bar/), [`profile-menu`](../frontend/src/app/layout/profile-menu/), [`footer`](../frontend/src/app/layout/footer/), [`app.routes.ts`](../frontend/src/app/app.routes.ts).

- Define the final information architecture for dashboard, collection, groups, and play.
- Remove links to nonexistent routes, including recommendations, quick play, and analytics; the currently identified dashboard/play links are now limited to existing routes or explicit coming-soon cards.
- Replace footer placeholder links with real routes or remove them.
- Review authenticated versus unauthenticated navigation after the Clerk migration.
- Review mobile navigation; the admin sidebar now collapses into a mobile overlay with a backdrop and keeps keyboard focus indicators.
- Standardize naming: meeting/session, play/history, group/member, and Board Vault terminology.
- Centralize loading, error, and toast behavior instead of repeating inconsistent patterns in `DataService` and pages.
- Verify keyboard access, focus visibility, labels, active states, and route transitions.

### 6. Dashboard — Partial / Needs review

Relevant surface: [`dashboard-page`](../frontend/src/app/pages/dashboard-page/).

- Keep activity, statistics, charts, and session summaries derived from persisted data; fabricated dashboard content has been removed.
- Keep dashboard links limited to existing routes; the dead activity and analytics links have been removed.
- Make dashboard cards represent the correct entity and count.
- Define a useful first-login empty state that guides a user to create/join a group and add games.
- Define loading, failure, and retry states for each dashboard data section; dashboard overview, groups, collection, history, and upcoming-session surfaces now distinguish loading, failure, and empty states, with retry recovering the core requests.
- Review responsive layout and visual hierarchy.

### 7. Collection — Partial / Needs review

Relevant surfaces: [`collection-page`](../frontend/src/app/pages/collection-page/), [`game-view`](../frontend/src/app/pages/games/game-view/), collection API/service code.

- Run a complete manual journey: browse/search, add, view ownership, review, wishlist, refresh, and remove/update.
- Keep the first-five-games activation flow visible on the collection page; the progress prompt and browse CTA now exist and ownership changes refresh the collection signal.
- Keep collection mutations synchronized with group availability; refreshed ownership data now updates the current member inside loaded group records as well as the personal collection signal.
- Complete the activation journey with a success state, onboarding preferences, and authenticated browser coverage.
- Make search, duplicate-add, loading, empty, error, and success states coherent; the primary collection and groups pages now distinguish request failures from empty data and expose retry actions.
- Browse search now distinguishes catalog load errors from valid no-results responses and offers retry; duplicate/add feedback and broader rendered-state review remain.
- Resolve game title/translation behavior across cards, search, proposals, history, and game detail.
- Ensure purchase metadata, wishlist priority, reviews, and tags have consistent labels and validation.
- Game detail history now displays group names through the loaded group index; failed game-detail requests now leave the loading state and expose a retry action.
- Review responsive card grids, image fallbacks, accessible controls, and keyboard behavior.
- Expand the targeted frontend response schemas in [`api.schemas.ts`](../frontend/src/app/api/api.schemas.ts) across the remaining API surface.

### 8. Groups and invitations — Partial / Needs review

Relevant surfaces: [`groups`](../frontend/src/app/pages/groups/), [`group-view`](../frontend/src/app/pages/group-view/), group/invitation/notification components.

- Verify the complete two-account flow: create group, invite account, accept/reject invitation, refresh, and see membership.
- Keep group creation awaitable and recoverable; the create form now waits for the API result before navigating and leaves failures retryable, while the backend now creates the group and owner membership in one Turso transaction.
- Keep invitation send, pending-invitation removal, and member removal awaitable; group editing now keeps retryable selections and prevents overlapping requests.
- Resolve the product policy for self-join versus invite-only membership.
- Define group owner/member roles and expose only actions allowed for each role.
- Make empty groups useful: explain the next step for members, games, and invitations; failed group loading now has an explicit retry state.
- Ensure member visibility and private group data follow the backend authorization rules; group-history failures no longer get cached as an empty result and now expose retry.
- Remove unnecessary reload-all behavior after group mutations where safe.
- Review invitation and notification feedback, unread/read states, and failure recovery.
- Review member cards, avatars, long usernames, and mobile layouts.

### 9. Authentication, profile, and settings — Verified slice / Partial

Relevant surfaces: [`auth pages`](../frontend/src/app/pages/auth/), [`profile-menu`](../frontend/src/app/layout/profile-menu/), [`settings`](../frontend/src/app/pages/settings/), Clerk integration.

- Keep Clerk email/password/username as the production path and preserve the legacy path only as an intentional migration fallback.
- Keep legacy registration/reset/verification UI only as a fallback when Clerk is unavailable; `/login` and `/register` are now Clerk-first in production.
- Define the final username policy and whether it is required at account creation.
- Keep the security settings page connected to Clerk account/security controls; local Board Vault account deletion remains disabled until the data-retention policy and deletion workflow are defined.
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
- The admin panel landing page now provides an honest responsive hub for the implemented catalogue tools; persisted operational metrics remain intentionally deferred.

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
- Add timezone-focused browser coverage around scheduled-session display and keep all relative-time utilities based on instant timestamps rather than server/local offset corrections; `formatDate.ts` no longer applies a fixed Spain correction.
- Avoid mutating nested signal state in place where it can produce stale UI.
- Add shared UI conventions for buttons, cards, forms, modal behavior, spacing, typography, colors, and icons.

### 12. Frontend testing and contracts — Partial

- Replace the generated single frontend smoke test with route/component/state tests for critical journeys. Playwright now covers public landing, signed-out dashboard protection, and the wildcard not-found route.
- Add browser coverage for Clerk login, collection activation, group invitation, session creation, and session completion.
- Expand frontend API response schemas and validate representative responses at the boundary; session, meet, recommendation, and feedback responses are now covered.
- Add contract tests for frontend/backend session, collection, group, and recommendation flows.
- Add clean-environment test data and a documented two-account acceptance journey.

## P2 — backend, data, and delivery dependencies

These are not purely frontend tasks, but they block reliable product UX completion:

- Extend the completed session write into the full session write/lifecycle API; see [`data-model.md`](data-model.md) and [`database/drift-report.md`](../database/drift-report.md).
- Establish a repeatable migration runner and empty-state recreation from the synchronized schema.
- Complete the remaining authorization, response-privacy, validation, and API-contract reviews.
- Add lockfiles, a documented Node/package-manager choice, and root development commands.
- Add CI gates for builds, tests, lint, formatting, and migrations.
- Add health/readiness checks, structured observability, backup/restore rehearsal, and rollback instructions.
- Replace the stale backend e2e starter test with product behavior tests.
- Resolve remaining backend lint failures and expand meaningful integration coverage.

## Recommended execution order

1. Remove dead routes, dead links, unsupported claims, and obviously misleading hardcoded UI.
2. Extend the canonical completed-session API into scheduled sessions and lifecycle transitions.
3. Connect session creation, attendee selection, planned games, completion, and history.
4. Implement recommendations and the first-five-games collection activation flow.
5. Rework the flagship UI/UX around those stable contracts.
6. Run the responsive/accessibility pass and add browser coverage.
7. Complete launch-readiness, data-recreation, CI, and operational gates.

The agent claiming implementation work must use the task board in [`todo/06-agent-task-board.md`](../todo/06-agent-task-board.md), keep one active task, and record verification evidence before marking work complete.
