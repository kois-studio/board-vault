# ADR: Account deletion and leaving a group

- **Status:** Accepted
- **Date:** 2026-10-07
- **Supersedes:** The `user.deleted` behaviour of ADR-0013, and ADR-0017's "self-deletion is off until #102"
- **Superseded by:** None

## Context

A game night belongs to everyone who played it. If Carlos, Mario and Jose
played Catan one Friday, Carlos and Jose still remember three players after
Mario deletes his account or leaves the group. Before this decision:

- Deleting a Clerk user only set `isDeleted` on the account. The name,
  email, avatar, collection and memberships all stayed, and history went on
  showing the person by name.
- Leaving a group only deleted the membership. History showed the person
  exactly like a current member, and they could still be put in new sessions
  through their group person.
- Nothing decided who owns a group whose owner leaves for good.

Self-deletion was switched off everywhere until this was decided (#102).

## Decision

**History keeps everyone.** Completed sessions are never changed when someone
leaves or deletes their account: attendance, played games, results and
scores stay. Counts stay the same: a night with three players still has three.

**Each person has a standing in each group,** worked out when it is read,
never stored:

| Standing | When | How history shows them |
| --- | --- | --- |
| `member` | Placeholder that is active, or linked account that is a member (the owner always is) | Normally |
| `left` | Archived, or linked account that is no longer a member | "Mario (left)", avatar muted |
| `deleted` | Linked account is deleted | "Deleted account", grey avatar |

Rejoining makes someone a `member` again with nothing to undo. Group-person
reads return the standing, and history records carry it for group people and
accounts alike. Only `member` people can be added to a session; someone
already in a running session may stay.

**Leaving a group** (or being removed by the owner) deletes the membership,
takes the person out of the group's *scheduled* sessions, and passes the
scheduled and running sessions they organised to the group owner. The owner
cannot leave or remove themselves.

**Deleting an account** runs in one transaction:

1. Each group they own passes to the member who joined first. A group with no
   other member is deleted with its sessions; nobody else can see it.
2. They leave every group, as above.
3. Their group people keep their place in history, renamed "Deleted account"
   with a grey avatar; the ownership and preferences entered for them go.
   Pending claims addressed to their email are cleared.
4. Private data is deleted: shelf, wishlist, reviews, collection activity,
   notifications, group game interest, invitations sent or received, and
   game proposals still pending. Approved games stay in the catalogue.
   Group data they entered for others (acquisition decisions, recommendation
   feedback) stays, unattributed.
5. The `Account` row stays, so references hold, but keeps nothing personal:
   email `deleted-<id>@deleted.invalid`, username `deleted-<id>`, name
   "Deleted account", grey avatar, `isAdmin` off, `isDeleted` on. The
   `clerkUserId` stays, so a late webhook or a sign-in attempt finds the
   deleted account instead of creating a new one.

**Board Vault runs the flow.** `DELETE /auth/account` deletes the signed-in
account, then removes its Clerk user. If Clerk fails, the account is still
deleted (sign-in is refused) and an error is logged for the operator. A
deletion that starts in Clerk (an operator in the Dashboard) reaches the same
state through the `user.deleted` webhook; running it twice changes nothing.
Clerk's own self-deletion stays off for good.

**No grace period.** Deletion is immediate and permanent, behind a typed
confirmation (the username) that lists what goes and what stays. Production
backups cover operator mistakes.

## Consequences

- The cache is cleared after a deletion: reviews, collections and group views
  of many people change at once.
- A person who deletes their account and signs up again starts as a new
  account; the email is free again.
- A group's collection and worth drop by the games of whoever left or was
  deleted; that is expected.
- Deleting a group removes its session rows first. Its group people are held
  by them with `RESTRICT`, so with foreign keys on, deleting the group alone
  failed once it had history; the owner's "Delete group" uses the same order.
- Accounts deleted before this decision still carry their old details until
  an operator re-runs the deletion for them.
