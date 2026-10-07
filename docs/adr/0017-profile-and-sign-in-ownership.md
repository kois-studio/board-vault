# ADR: Who owns the profile and the sign-in details

- **Status:** Accepted
- **Date:** 2026-10-07
- **Supersedes:** None
- **Superseded by:** [ADR-0018](0018-account-deletion-and-leaving-groups.md), for account deletion only

## Context

Clerk's account panel and Board Vault's Settings → Profile both edited a
name, a picture and a username, and the two never stayed in step:

- Clerk's first name, last name and photo were never shown in Board Vault.
  People could upload a photo and then never see it.
- The username was editable in both places. Clerk uses it to sign in and
  Board Vault uses it to invite people to groups, and after the first sign-in
  nothing kept the two copies the same. On 2026-10-07, 3 of 13 production
  accounts had a different username in each place. Clerk stores usernames
  in lower case, while Board Vault matched them exactly. Board Vault also
  accepted characters that Clerk does not allow.
- Settings → Security said self-deletion was unavailable, while Clerk's panel
  offered it.

## Decision

Each value has one owner.

| Value | Owner | Board Vault's copy |
| --- | --- | --- |
| Email addresses, password, signed-in devices | Clerk | Primary email, synced by webhook (ADR-0013) |
| Username | Clerk | Synced by webhook; read-only in the app |
| Display name and avatar | Board Vault | — |
| Clerk first name, last name, photo | Not used | Turned off or hidden |

- **The username is changed in Clerk.** It is a sign-in identifier, and Clerk
  enforces its uniqueness and rules. The `user.updated` webhook copies a
  changed username to the linked account. If another account already has it,
  nothing changes and a warning is logged, as with emails.
  `PUT /users/:userId` no longer accepts `username`.
- **Usernames match case-insensitively**, both for invitations and when an
  account is provisioned.
- **Settings has three sections:**
  - *Profile:* how group members see you. Avatar and display name are
    editable, and the username is shown read-only.
  - *Appearance.*
  - *Account:* replaces Security. It shows the username and email and opens
    Clerk's panel to change them, the email addresses, the password and the
    devices.
- **Clerk's panel is trimmed.** First and last name are turned off in every
  Clerk instance. The panel's profile row (photo and name) and its delete
  section are hidden with `appearance.elements`, and its first page is
  renamed from "Profile" to "Sign-in", so it does not clash with Settings →
  Profile.
- **Self-deletion is off until #102 defines the flow.** Every existing Clerk
  user has `delete_self_enabled: false`. The unused
  `DELETE /users/:userId` route is removed. A deletion made by an operator
  in Clerk still soft-deletes the account (ADR-0013).

## Consequences

- One place to change each value, and the app shows what Clerk signs in with.
- A username change made in Clerk shows in the app right away for that
  person. Other people see it once the webhook arrives, usually within seconds.
- Hiding parts of Clerk's panel is cosmetic: a scripted client could still
  set a Clerk photo or names. Board Vault never reads them, so nobody else
  can see them.
- The instance-wide "Allow users to delete their accounts" setting is
  Dashboard-only (the Clerk CLI cannot change it). Until an owner turns it
  off, new users can technically delete themselves through Clerk's API. The
  webhook then soft-deletes their account.
