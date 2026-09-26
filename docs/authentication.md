# Authentication and onboarding state map

Board Vault uses Clerk for the provider-managed identity session and a local
`Account` row for product data. A Clerk session is not treated as a ready
Board Vault session until the backend resolves or provisions the local account
and the frontend loads the current-user record.

## User-visible state map

| State | Entry | User sees | Exit |
|---|---|---|---|
| Signed out | No Clerk user is active | Public landing/auth navigation; private-beta copy when self-registration is closed | The user opens Clerk sign-in/sign-up or follows an invitation |
| Provider authentication | Clerk's sign-in/sign-up UI is open | Clerk's secure authentication UI | Clerk reports a signed-in user, or the user cancels/returns |
| Linking and provisioning | Clerk reports a user ID but the local session is not ready | Stable full-page `Secure sign-in` handoff: “Connecting you to your Board Vault”, with an announced busy state; the header does not show a competing status or menu | `/auth/clerk/status` resolves the local account and the current-user record loads, or a safe error occurs |
| Ready | Local account and user data are loaded | Authenticated shell and group workspace navigation | Dashboard navigation for public auth routes; the originally requested protected route is preserved on refresh |
| Recoverable error | Provider identity exists but local validation/provisioning/data loading fails | Full-page explanation, `Try again`, `Sign out`, and invitation recovery guidance | Retry returns to linking; sign-out clears local state and returns to the landing page |

The same linking handoff is used for an existing-account Clerk sign-in, a new
invited account, and a signed-in session restored during refresh. Invitation
registration first completes the Clerk ticket flow, then enters the same local
account resolution and current-user loading state. The private-beta policy is
unchanged: public self-registration remains closed unless explicitly enabled;
an invitation is the supported new-account path.

Invitation registration keeps provider details out of the rendered UI. Known
provider codes become user-actionable guidance for the security check, username
availability, password policy, or expired/used ticket; unknown failures use a
safe retry message.

After the invitation joins the verified account to the group, a targeted
placeholder is exposed only to that account as `claimable`. Targeted claims are
bound to the verified invitee email and expire with the 30-day invitation
window; revoking or deleting the legacy invitation clears the target when no
other active invitation remains. The group workspace
offers a review screen with per-game ownership and preference checkboxes, an
optional private collection import, and a separate “join as new person” action.
Claiming changes the group-person link atomically; it does not rewrite old
sessions or silently import private data.

## Implementation boundary

`LoginService` owns the Clerk-to-local readiness state and deduplicates
concurrent verification requests. `LayoutCompleteComponent` replaces the
route content with `AuthHandoffComponent` while a signed-in Clerk identity is
not yet a ready local session. `LayoutHeaderComponent` only exposes stable
public or authenticated navigation; it is not an authentication progress
surface.

The handoff is intentionally route-aware: completing authentication from `/`,
`/login`, or `/register` lands on `/dashboard`; a refresh of an existing
protected route keeps that route as the destination. A failed handoff never
silently reveals partially authenticated navigation.

## Verification expectations

The state map requires unit coverage for readiness gating and concurrent
verification, plus authenticated browser coverage for sign-in and invitation
registration. A failed invitation ticket must remain actionable: the UI should
explain that the link may be expired, already used, or attached to an
unavailable group, and provide a route that clears the stale ticket before a
fresh invitation is used. Rendered review must cover narrow mobile and desktop
widths, keyboard focus, screen-reader announcements, provider delay/failure,
retry, sign-out, refresh, and back navigation before the onboarding ticket is
removed from `docs/TODO.md`.
