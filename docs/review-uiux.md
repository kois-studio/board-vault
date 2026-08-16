# Board Vault UI/UX review register

This document tracks whether each frontend area has received a deliberate UI/UX review. It is a review register, not a claim that a route works. A source audit can identify risks, but an area is not considered fully reviewed until its states, interaction model, responsive behavior, accessibility basics, visual hierarchy, and real API behavior have been exercised.

Reviewed: 2026-08-16

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
| Header and public navigation | `header`, `/login`, `/register` links | Partially reviewed | Clerk production controls work, but navigation needs a final signed-out/signed-in and mobile review. |
| Login | `/login`, login form | Partially reviewed | Production Clerk login was manually verified; review error, loading, expired-session, keyboard, and legacy-UI behavior. |
| Registration | `/register`, register form | Partially reviewed | Clerk signup/linking was manually verified; review username requirements, duplicate identity, errors, and whether legacy registration remains visible. |
| Email verification/reset | `/verify-email/:token`, `/reset-password/*` | Source-audited | Decide whether these legacy pages remain reachable after Clerk; review only if retained. |
| Footer | `footer.component` | Source-audited | Replace or remove placeholder links and review hierarchy, contrast, and mobile layout. |

## Authenticated application shell

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Authenticated header | `header`, `top-bar` | Source-audited | Review information architecture, active states, mobile navigation, focus, and terminology. |
| Profile menu | `profile-menu`, invitation/notification modals | Source-audited | Review account identity, unread states, modal behavior, errors, and small-screen usability. |
| Basic/complete layouts | `layout-basic`, `layout-complete` | Source-audited | Validate distraction-free action pages versus browsing pages; review spacing, scroll, and responsive behavior. |
| Shared controls | button, badge, page header, container, spinner, tooltip, image background | Source-audited | Establish shared component conventions and accessibility; test loading and icon-only variants. |
| Cards and sections | account, game, group, invitation, notification, card section | Source-audited | Review density, hierarchy, long content, actions, empty states, and mobile wrapping. |
| Toasts and global loading | `toast`, `loading.service`, `DataService` patterns | Source-audited | Standardize timing, severity, focus/announcement behavior, and failure recovery. |

## Authenticated product areas

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Dashboard home | `/dashboard`, `dashboard-page` | Source-audited | Fabricated activity/analytics and dead links were removed; overview loading, failure, retry, and first-entry states are now explicit. Continue with rendered responsive, keyboard, focus, contrast, and visual-hierarchy review. |
| Groups index | `/groups`, `groups-page` | Source-audited | Loading, empty, and retryable failure states now distinguish unavailable data from no groups; review create/join guidance, group card hierarchy, and responsive grid. |
| Create group | `/create-group`, `group-create` | Source-audited | Review form labels, validation, success navigation, duplicate/error handling, and mobile form layout. |
| Group detail | `/groups/:groupId`, `group-view` | Source-audited | Member selection now defaults to all members per group and does not leak across groups; review member/game/history hierarchy, owner actions, invitation feedback, session-shaped loading skeleton, private-data states, and mobile tables/cards. |
| Edit/leave/delete group | `/groups/:groupId/{edit,leave,delete}` | Source-audited | Review permissions, confirmation language, destructive actions, cancellation, and failure recovery. |
| Invitations | profile invitation modal, group edit invitation controls | Partially reviewed | The profile modal now distinguishes loading, failed fetch, retry, and empty states; pending group invitations are owner-only under ADR-0007; verify the two-account journey and review pending/accepted/rejected/expired states. |
| Notifications | profile notification modal | Partially reviewed | The modal now distinguishes loading, failed fetch, retry, and empty states and has dialog semantics; review unread/read behavior, message clarity, and focus management. |
| Collection landing | `/collection`, `collection-page` | Partially reviewed | First-five-games activation progress and a browse CTA now exist; still needs full empty/error/refresh review and responsive/accessibility testing. |
| My games | `/collection/games`, `my-games-page` | Source-audited | Loading, empty, and retryable failure states now distinguish unavailable data from an empty collection; review ownership status, sorting, duplicate feedback, and card responsiveness. |
| Browse games | `/collection/browse`, `browse-page` | Source-audited | Review search, filtering, no-results, pagination/loading, add feedback, and keyboard operation. |
| Game detail | `/games/:gameId`, `game-view` | Source-audited | Ownership mutations now refresh collection state and reset their busy state after failures, route/auth changes avoid duplicate detail loads, history resolves group names, and failed loads have a retry state; still review ownership, wishlist, reviews, tags, purchase metadata, image fallbacks, and permission states. |
| Reviews | `/collection/reviews`, `reviews-page` | Source-audited | Review rating scale, edit/delete behavior, aggregation clarity, empty state, and validation. |
| Wishlist | `/collection/wishlist`, `wishlist-page` | Source-audited | Review priority, notes, add/remove behavior, empty state, sorting, and responsive layout. |
| Game proposal | `/collection/propose-game`, `propose-game-page` | Source-audited | Review long form, validation, image URL errors, duplicate/pending messaging, and submission feedback. |
| Submissions | `/submissions`, `submissions-page` | Source-audited | Review proposal status presentation, empty state, detail visibility, and refresh persistence. |

## Play and session areas

| Area | Routes/components | Current status | Known review scope / next action |
|---|---|---|---|
| Play landing | `/play`, `play-page` | Partially reviewed | Upcoming count/date and completed-history count come from loaded data; recommendations link to the implemented first-release flow while analytics remain deferred. Review loading/error/empty states, responsive layout, accessibility, and richer session summaries. |
| Schedule session | `/play/upcoming-sessions`, schedule form | Partially reviewed | Scheduled/active sessions and the scheduling entry point are backed by persisted lifecycle data; loading, failure/retry, and empty states now have separate copy; review status cards, date/timezone validation, planned games, and mobile layout. |
| Log session wizard | `/play/log-session`, `log-session-wizard` | Partially reviewed | The wizard persists completed sessions through the canonical API; review validation, failure recovery, success navigation, loading states, and authenticated browser coverage. |
| Meeting creation | `/groups/:groupId/meets/new`, `meet-new` | Partially reviewed | The selected date/timezone, attendees, and optional planned games now reach the canonical scheduled-session API; review group selection, member-list empty/loading states, date validation, pending attendees, and failure recovery. |
| Meeting detail | `/meets/:meetId`, `meet-view` | Partially reviewed | Organizer lifecycle controls, planned/played game read separation, atomic attendee replacement, awaited game writes, rollback-on-error, terminal-state editing guards, translated game labels, and retryable load failures now exist; review planned-game display/transition controls, attendee semantics, error feedback, and responsive controls. |
| Meeting confirmation | Removed | Reviewed | Removed the no-op confirmation route because attendee and played-game changes persist immediately from meeting detail; the detail page now says so explicitly. |
| Upcoming sessions | `/play/upcoming-sessions` | Partially reviewed | Reads scheduled/active sessions and offers real group scheduling links; review status cards, group labels, loading/error states, and mobile layout. |
| History | `/play/history` | Partially reviewed | Reads completed-only history with actionable empty state and group labels; loading failures now have a retry state and the loading skeleton matches the session/game card structure; review richer game/session details and responsive cards. |
| Recommendations | `/play/recommendations`, recommendations page | Partially reviewed | Group/attendee selection, optional duration, loading/error/no-results states, explanation cards, direct scheduling handoff, and “Not for us” feedback now exist. Run the authenticated browser journey and complete responsive, keyboard, focus, contrast, and real-data review. |
| Quick play | `/play/quick-play` link/reference only | Blocked | No declared route or implemented flow currently exists. |
| Analytics | `/play/analytics` link only | Blocked | No declared route or persisted analytics read model exists; create the contract before exposing analytics navigation. |

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
