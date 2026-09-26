# End-to-end UX flow review

## Organizer-first participant flow

The intended connected journey is:

1. Carlos creates a group and adds named group people without creating
   accounts for them.
2. He records ownership assertions and preferences, selects any mixture of
   real and placeholder people for recommendations, and schedules/completes a
   session with per-game participants.
3. He sends either a provider email invitation or a legacy username invitation
   targeted at one placeholder.
4. The verified invitee enters the group, sees only an actor-specific claim
   prompt, reviews and deselects imported items, and optionally imports kept
   ownership into the private collection.
5. Claiming preserves the same history; choosing “join as new person” creates a
   separate linked identity with no placeholder history.

The recovery branches are expired/revoked invitation, wrong-email claim,
already-claimed placeholder, unavailable group, failed claim retry, and
duplicate new-person join. These should remain visible and actionable without
revealing claim emails or other private account fields.

Board Vault is a social decision-and-memory product. Its UX must therefore be
reviewed as journeys across screens, data states, and people—not as isolated
component screenshots.

## Review unit

Every important user job gets a flow map with:

1. **Entry state** — where the person starts and what they already know.
2. **Primary path** — the shortest honest route to the intended outcome.
3. **Branch paths** — owner/member, empty/established group, first-time/returning
   user, and invitation variants.
4. **Recovery paths** — loading, refresh, expired invitation, provider/API
   failure, unavailable group, duplicate action, and retry.
5. **Destructive paths** — leave, delete, revoke, remove, or undo behavior with
   clear consequences and focus return.
6. **Shared-state checkpoints** — what another group member sees after the
   action, and whether the result survives refresh.
7. **Evidence** — automated browser coverage, rendered review, and human
   keyboard/content/screen-reader judgment where automation is insufficient.

The review is not complete when each screen looks acceptable. It is complete
when a person can understand the next action, complete the job, recover from
normal failures, and see the social consequence of the action.

## Review matrix

| Flow | Primary path | Required branches | Current evidence | Remaining review |
|---|---|---|---|---|
| Authenticated entry | Landing → sign in/register → account handoff → dashboard | delayed linking, provider failure/retry, invitation registration, sign-out, refresh/back | Local delayed and failed Clerk handoff passes at 375px and 1280px; the opt-in flow also asserts a protected `/groups` destination survives refresh; the Testing Token-backed connected journey passes a real Development invitation-ticket signup, local provisioning, group membership, and dashboard handoff | Validate Production-style human CAPTCHA and email delivery, then complete human focus, content, and screen-reader review |
| First group activation | Landing/dashboard → create group → new workspace → invite people → add games → choose a game → plan first night | owner/member, empty group, invite existing/new person, declined/expired invite, refresh and unavailable group | Fixture-gated journeys now cover the primary owner/member path in 6.5 seconds, a temporary create failure → durable recovery → retry in 1.6 seconds, invitation keep-it → explicit decline in 3.4 seconds, new-person provider-invitation failure → preserved email → retry in 3.6 seconds, and a real Development invitation-ticket signup → local provisioning → two-member visibility path. The primary run also caught missing native submit handlers in group creation and group management. | Validate human CAPTCHA/email delivery, expiry/refresh/unavailable-group variants, then human content, focus, and screen-reader review |
| Leave or delete a group | Group workspace/management → contextual confirmation → leave/delete → groups recovery | member leave, owner delete, cancel/focus return, stale/legacy URL | Destructive-flow coverage proves contextual confirmations and compatibility handoffs | Human consequence/copy review in a real owner/member workspace |
| Play and remember | Group → recommendation → session plan → RSVP/attendance → play → feedback → history/library | refresh, retryable detail failure, per-game participants, no attendees, completion race | Fresh two-account session loop passes through shared history and library context | Real-user usefulness of memory and recommendation feedback |
| Acquisition decision | Group library → search → shared shortlist → owner decision → reopen | already owned, ownership race, member interest removal, not-now/reopen, failed board load | Disposable acquisition journey and backend ownership-race tests pass | Real-group language and decision usefulness |

## How to test a flow

For each flow, record a small state graph before changing UI. Test the primary
path first, then each branch that changes permissions, data visibility, or the
next action. Use fresh disposable data for mutations and keep the exact
starting state in the test name or fixture documentation.

At each transition ask:

- Can the person tell where they are and what just happened?
- Is the next action appropriate for their role and current data?
- Does the UI distinguish loading, empty, unavailable, and failed states?
- If the browser refreshes now, does the journey resume truthfully?
- What does the other person in the group see?
- Can the person recover without guessing, repeating a destructive action, or
  losing work?
- Does the route, focus, announcement, and copy remain usable on a narrow
  viewport and with a keyboard?

## Evidence levels

- **Automated contract**: unit/API assertions prove data and permission rules.
- **Automated browser flow**: Playwright proves a connected path against
  disposable data, including refresh and failure branches where relevant.
- **Rendered review**: the flow is inspected at representative viewport sizes
  for hierarchy, overflow, focus, and visible next actions.
- **Human acceptance**: a person completes the journey with keyboard and
  assistive technology, and confirms that the language and social consequence
  are understandable.

A flow is not ready for release if it only has screen-level or contract-level
evidence while its cross-screen handoffs remain untested.
