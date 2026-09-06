# Board Vault UI/UX review register

This document tracks whether each frontend area has received a deliberate UI/UX review. It is a review register, not a claim that a route works. A source audit can identify risks, but an area is not considered fully reviewed until its states, interaction model, responsive behavior, accessibility basics, visual hierarchy, and real API behavior have been exercised.

Reviewed: 2026-09-06

## Review status

- **Not reviewed** — no systematic UI/UX review has been recorded.
- **Source-audited** — implementation was inspected and known issues are listed, but rendered behavior has not passed a full review.
- **Partially reviewed** — some behavior or environment was manually checked, but important states, breakpoints, accessibility, or end-to-end behavior remain unverified.
- **Blocked** — a meaningful review depends on unfinished product/API behavior.
- **Reviewed** — the area has passed the agreed UI/UX checklist and has evidence recorded. No area currently has this status.

## Review checklist

For each area, review:

1. Purpose, vocabulary, information hierarchy, and next action.
2. Loading, empty, error, retry, disabled, success, and permission states.
3. Keyboard access, focus visibility, labels, semantics, and screen-reader basics.
4. Mobile, tablet, desktop, long text, and unusual data behavior.
5. Visual consistency with the shared shell, buttons, cards, forms, modals, spacing, typography, and color system.
6. Real API behavior, refresh persistence, authorization feedback, and navigation destinations.
7. Browser evidence and follow-up TODOs.

## Public and authentication surfaces

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Landing page | `/`, `landing.component` | Partially reviewed | Public route/content-truth behavior is covered by Playwright; continue with rendered responsive, keyboard, focus, contrast, semantics, and visual-hierarchy review. |
| Header and public navigation | `header`, `/login`, `/register` links | Partially reviewed | Clerk production controls work, and public section links now route through the landing page from any shell location; navigation still needs a final signed-out/signed-in and mobile review. |
| Login | `/login`, login form | Partially reviewed | Production Clerk login was manually verified; the preserved-account fallback now has responsive sizing, labels, autocomplete, and an honest submit state. Review error, loading, expired-session, keyboard, and legacy-UI behavior. |
| Registration | `/register`, register form | Partially reviewed | Clerk signup/linking was manually verified; invited registration now uses an explicit username/password form, mounts the bot-protection target, activates the created session, and redirects to the dashboard. The degraded-mode fallback has responsive sizing, labels, and password-manager metadata. Review Smart CAPTCHA interaction, duplicate identity, errors, and whether legacy registration remains visible. |
| Email verification/reset | `/verify-email/:token`, `/reset-password/*` | Source-audited | Decide whether these legacy pages remain reachable after Clerk; review only if retained. |
| Footer | `footer.component` | Source-audited | Replace or remove placeholder links and review hierarchy, contrast, and mobile layout. |

## Authenticated application shell

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Authenticated header | `header`, `top-bar` | Source-audited | Review information architecture, active states, mobile navigation, focus, and terminology. |
| Profile menu | `profile-menu`, invitation/notification modals | Source-audited | Review account identity, unread states, modal behavior, errors, and small-screen usability. |
| Basic/complete layouts | `layout-basic`, `layout-complete` | Source-audited | Validate distraction-free action pages versus browsing pages; review spacing, scroll, and responsive behavior. |
| Shared controls | button, badge, page header, container, spinner, tooltip, image background | Source-audited | The theme toggle now has a state-aware accessible name, pressed state, and visible keyboard focus. Establish the remaining shared component conventions and accessibility; test loading and icon-only variants. |
| Cards and sections | account, game, group, invitation, notification, card section | Source-audited | Review density, hierarchy, long content, actions, empty states, and mobile wrapping. |
| Toasts and global loading | `toast`, `loading.service`, `DataService` patterns | Source-audited | Standardize timing, severity, focus/announcement behavior, and failure recovery. |

## Authenticated product areas

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Dashboard home | `/dashboard`, `dashboard-page` | Source-audited | The authenticated home now leads with group workspaces, each group’s shared game count/members/next session, and direct decision/session actions; the personal collection-value counter was removed from this social surface. Loading and retry now depend only on groups and upcoming sessions, so unrelated collection/history failures do not block the workspace. Continue with rendered responsive, keyboard, focus, contrast, and visual-hierarchy review. |
| Groups index | `/groups`, `groups-page` | Source-audited | Loading, empty, and retryable failure states now distinguish unavailable data from no groups; review create/join guidance, group card hierarchy, and responsive grid. |
| Create group | `/create-group`, `group-create` | Source-audited | Review form labels, validation, success navigation, duplicate/error handling, and mobile form layout. |
| Group detail | `/groups/:groupId`, `group-view` | Partially reviewed | The route is now shaped as a group-first social home with an accessible area navigator matching the rendered order: Decide, Games to acquire, Sessions, Group library, and History/insights. It also includes next session, group pulse, attendee context, shared library, acquisition decisions, recommendation hand-off, recent group memory, and basic most-played/participation insights. Loading, retryable group-list failure, unavailable-group recovery, route-state reset, sized/named group-library game links, and a 375px horizontal-overflow guard are now explicit. A rendered mobile pass found the core hierarchy usable; invitation feedback, image fallbacks, private-data states, keyboard/focus/contrast behavior, and long-content review remain. |
| Edit/leave/delete group | `/groups/:groupId/{edit,leave,delete}` | Source-audited | Owner/member visibility is now explicit: members see read-only guidance, owners see management controls, owners cannot leave, and destructive actions wait for API success. Review confirmation language, cancellation, failure recovery, and responsive presentation. |
| Invitations | groups workspace, profile invitation modal, group edit invitation controls | Partially reviewed | Pending invitations are now visible at the groups workspace boundary with direct accept/decline actions; the shared invitation card explains the membership consequence, confirms a decline before mutating it, and keeps failures retryable. Group edit invitation mutations are owner-only, existing-member username validation is visible, provider email invites are listed/revocable for owners, and group management copy distinguishes username invites from new-person email invites. The profile modal remains a secondary access path; pending/accepted/rejected/expired states, notification clarity, provider delivery, and rendered responsive/keyboard behavior still need review. |
| Notifications | profile notification modal | Partially reviewed | The modal now distinguishes loading, failed fetch, retry, and empty states and has dialog semantics; review unread/read behavior, message clarity, and focus management. |
| Collection landing | `/collection`, `collection-page` | Partially reviewed | First-five-games activation progress and a browse CTA now exist; the progress meter now exposes semantic min/max/current values, and collection refresh failures preserve the last known shelf with an explicit retry state; review responsive/accessibility behavior and mutation feedback. |
| My games | `/collection/games`, `my-games-page` | Source-audited | Loading, empty, and retryable failure states now distinguish unavailable data from an empty collection; review ownership status, sorting, duplicate feedback, and card responsiveness. |
| Browse games | `/collection/browse`, `browse-page` | Source-audited | The search field now has a persistent accessible label and retains the group-acquisition context in its surrounding copy. Review search, filtering, no-results, pagination/loading, add feedback, and keyboard operation. |
| Game detail | `/games/:gameId`, `game-view` | Source-audited | Ownership mutations now refresh collection state and reset their busy state after failures, route/auth changes avoid duplicate detail loads, history resolves group names, and failed loads have a retry state; still review ownership, wishlist, reviews, tags, purchase metadata, image fallbacks, and permission states. |
| Reviews | `/collection/reviews`, `reviews-page` | Source-audited | Failed loads now leave the skeleton state and expose retry; review rating scale, edit/delete behavior, aggregation clarity, empty state, and validation. |
| Wishlist | `/collection/wishlist`, `wishlist-page` | Source-audited | Failed loads now leave the skeleton state and expose retry; review priority, notes, add/remove behavior, empty state, sorting, and responsive layout. |
| Game proposal | `/collection/propose-game`, `propose-game-page` | Source-audited | Review long form, validation, image URL errors, duplicate/pending messaging, and submission feedback. |
| Submissions | `/submissions`, `submissions-page` | Source-audited | Proposal stats/list loading and failure states now distinguish unavailable data from an empty feed and expose retry; review proposal status presentation, detail visibility, and refresh persistence. |

## Play and session areas

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Play landing | `/play`, `play-page` | Partially reviewed | Upcoming count/date and completed-history count come from loaded data; the landing cards now distinguish loading and unavailable states, session dates use the stored IANA timezone, recommendations link to the implemented first-release flow, and analytics remain deferred. Review responsive layout, accessibility, and richer session summaries. |
| Schedule session | `/play/upcoming-sessions`, schedule form | Partially reviewed | Scheduled/active sessions and the scheduling entry point are backed by persisted lifecycle data; the group scheduling form now uses a three-step game-night plan for date, attendees, and optional shortlist; RSVP is now a member-level planning signal and organizers can edit the shortlist on the session record; review time/timezone semantics and mobile layout. |
| Log session wizard | `/play/log-session`, `log-session-wizard` | Partially reviewed | The wizard persists completed sessions through the canonical API, including an optional final note; its group step has explicit loading, failure, and empty states and keyboard-operable group choices. The participant step now uses mobile-friendly per-game cards instead of a horizontal matrix and requires at least one participant per selected game. Review validation, submission recovery, success navigation, and authenticated browser coverage. |
| Session creation | `/groups/:groupId/sessions/new`, `meet-new` | Partially reviewed | The selected date/time/timezone, attendees, optional planned games, and optional context now reach the canonical scheduled-session API; the form now explains the plan → coordinate → shortlist workflow and has explicit selection summaries; review time/timezone semantics, planned-game editing, and failure recovery. Legacy `/groups/:groupId/meets/new` redirects here. |
| Session detail | `/sessions/:sessionId`, `meet-view` | Partially reviewed | Organizer lifecycle controls, human-readable Planned/Live now/Completed/Cancelled status labels, planned/played/skipped separation, atomic attendee replacement, editable shortlist, member RSVP, organizer-recorded actual attendance, attendee-only post-session game ratings, persisted session context, awaited game writes, rollback-on-error, terminal-state editing guards, translation-backed labels, member-scoped canonical session detail reads, and retryable load failures now sit inside a game-night plan/record UX; review error feedback and rendered responsive controls. Legacy `/meets/:meetId` redirects here. |
| Session confirmation | Removed | Reviewed | Removed the no-op confirmation route because attendee and played-game changes persist immediately from session detail; the detail page now says so explicitly. |
| Upcoming sessions | `/play/upcoming-sessions` | Partially reviewed | Reads scheduled/active sessions and offers real group scheduling links. Session cards now lead with the group name and human-readable Planned/Live now state, expose saved planning notes, and remove the internal session identifier from the primary context. Review rendered status hierarchy, loading/error states, and mobile/keyboard layout. |
| History | `/play/history`, `/play/history?groupId=:groupId` | Partially reviewed | Reads completed-only history with actionable empty state and group labels; group-home links preserve the selected group context, loading failures have a retry state, and the loading skeleton matches the session/game card structure. Group-home history cards now expose recorded attendees and saved session notes; review richer personal-history context and responsive cards. |
| Recommendations | `/play/recommendations`, recommendations page | Partially reviewed | Group loading/failure states now distinguish unavailable data from no groups and expose retry. Group/attendee selection, optional duration, balanced/fresh/favorite decision lenses, loading/error/no-results states, explanation cards, persisted last-played context, current group interested/passed signals, direct scheduling handoff, and “Not for us” feedback now exist. Complexity and history-weighted scoring remain intentionally deferred until real usage exists. Run the authenticated browser journey and complete responsive, keyboard, focus, contrast, and real-data review. |
| Quick play | `/play/quick-play` link/reference only | Blocked | No declared route or implemented flow currently exists. |
| Analytics | Group home insight cards; `/play/analytics` remains absent | Partially reviewed | The group home now shows lightweight most-played, participation, recently-played, and revisit signals from persisted completed sessions. A separate analytics route/read model remains deferred until real usage justifies it; review the rendered cards with real history before exposing more navigation. |

## Settings and administration

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Settings shell | `/settings`, settings navigation | Source-audited | Review navigation, active state, nested routing, mobile layout, and terminology. |
| Account settings | `/settings/account` | Source-audited | Review profile/avatar/display-name/username editing, validation, success/error states, and privacy presentation. |
| Security settings | `/settings/security` | Partially reviewed | Uses Clerk's account-management panel for email/password/sign-in methods; local Board Vault data deletion is intentionally disabled pending a retention/deletion policy. Review loading/error states, modal accessibility, and deletion policy when defined. |
| Contact settings | Removed | Reviewed for content truth | The unconfigured route and dead Featurebase links were removed; reintroduce only with a real support/feedback destination. |
| Admin shell | `/admin`, admin layout/sidebar | Source-audited | Sidebar now supports a collapsed mobile overlay with a backdrop and focusable toggle; review role gating, active states, navigation-after-selection, and unauthorized behavior. |
| Admin dashboard | `/admin/panel` | Source-audited | The blank placeholder was replaced with a responsive hub for implemented admin tools; review hierarchy, keyboard/focus behavior, and future persisted metrics when that contract exists. |
| Game proposals admin | `/admin/proposals` | Source-audited | Review table actions, filters, confirmations, status/error feedback, and responsive behavior. |
| Game management | `/admin/manage-games` | Source-audited | Review search, edit/delete actions, title/translation consistency, and destructive-action safety. |
| Tag management | `/admin/manage-tags` | Source-audited | Review category/tag hierarchy, modal forms, validation, duplicate errors, and mobile layout. |

## Cross-cutting review backlog

No frontend area currently has a recorded full UI/UX review. The following cross-cutting work must be applied to every area marked source-audited or partially reviewed:

- Responsive review at mobile, tablet, and desktop widths.
- Keyboard-only and focus review.
- Semantic headings, labels, dialog behavior, table semantics, and error announcements.
- Loading, empty, error, retry, permission, disabled, and success states.
- Date/time/timezone behavior.
- Long usernames, long game titles, missing images, zero-data accounts, and large collections.
- Consistent design tokens and shared components.
- Dead-link and unsupported-claim audit.
- API refresh/persistence and authorization behavior.
- Browser evidence added to the relevant section and linked from the implementation TODO.

## Review sequence

1. Public landing and authenticated shell.
2. Collection activation and game detail.
3. Groups and invitation lifecycle.
4. Canonical session flow after the API/write contract is complete.
5. Recommendations and history/analytics.
6. Settings and administration.
7. Final responsive, accessibility, content-truth, and browser-journey pass.

The implementation inventory is maintained in [`implementation-todo.md`](implementation-todo.md). Product task ownership remains in [`../todo/06-agent-task-board.md`](../todo/06-agent-task-board.md).
