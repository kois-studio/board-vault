# Product truth and launch readiness

## Problem

The public landing page currently describes capabilities that are not implemented or not connected to working backend behavior. This creates a trust gap between acquisition and activation.

Known areas requiring review:

- Board Vault brand and Session vocabulary are now canonical; legacy `Meet*` names remain only at compatibility/database boundaries;
- recommendations;
- statistics;
- native mobile applications;
- offline and push notifications;
- API access;
- billing and plan limits;
- privacy, security, terms, and support links;
- testimonials and social proof;
- placeholder `href="#"` links;
- hardcoded upcoming sessions, charts, and recommendation cards.

## Launch content rule

Every public claim must map to:

1. a real user-visible flow;
2. a backend capability where appropriate;
3. a test or manually verified acceptance path;
4. a support and privacy explanation if it handles user data.

If a capability is planned but not ready, label it as planned or remove it from the public surface.

## Launch gates

### Product gates

- A new group can reach its first recommendation without support.
- Recommendations are explainable and based on persisted data.
- A scheduled session survives refresh and appears in upcoming sessions.
- A completed session appears in history.
- Hardcoded demo content is absent from authenticated product screens.
- Empty states help users reach the next action.

### Security gates

- No privilege escalation through user-controlled fields.
- Private resources enforce ownership or group membership.
- Tokens expire and reset flows do not enumerate accounts.
- CORS, rate limiting, validation, and security headers are configured for production.

### Reliability gates

- Database can be recreated from migrations.
- Core journey tests pass in CI.
- Two-account end-to-end test passes against a clean environment.
- Health and error monitoring are available.
- Deployment configuration is documented and reproducible.

### UX gates

- Mobile layout is usable.
- Keyboard and screen-reader basics work.
- Date/time and timezone behavior is explicit.
- Loading, error, and empty states are coherent.
- All primary links lead to real destinations.

## Recommended launch posture

Launch as a focused early product for recurring groups, not as a complete board-game platform. The initial promise should be narrow enough that the implementation can satisfy it completely.
