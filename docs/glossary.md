# Board Vault glossary

Use these terms consistently in UI copy, API descriptions, tests, and future
product decisions.

| Term | Meaning | Avoid saying |
| --- | --- | --- |
| Group | A private workspace for one recurring game group. It owns shared decisions, sessions, and memory. | Community, public club |
| Group person | A person represented inside one group. It may be linked to an account, or remain a group-scoped placeholder until its owner claims it. | Fake user, synthetic account |
| Shelf | One account's private list of games they can bring. It is not automatically visible as a global catalogue. | Collection when the privacy boundary matters |
| Shared shelf | The group view derived from member-owned games and group-scoped ownership records. It is the input to recommendations and planning. | Marketplace, public library |
| Session | One planned or completed game night. The API still contains historical `Meet` names for compatibility. | Event when discussing game-night state |
| Shortlist | The games a group has chosen to consider for a session. A shortlisted game is not necessarily played. | Final selection |
| Played | A game recorded as actually played during a session. This is the source for history and memory. | Planned, attended |
| Skipped | A game that was planned or shortlisted but was not played. It remains useful context and is not deleted history. | Failed, removed |
| History | The durable record of completed sessions, games, participants, and notes that helps the group decide later. | Activity feed |
| Interest | A member's explicit signal that the group should consider acquiring a game nobody in the group currently owns. | Wishlist, purchase intent |
| Decision | The group owner's current resolution for an acquisition candidate: open, planned, or not now. It is a group coordination state, not a purchase record. | Order, transaction |

When a phrase must be shortened, prefer “person in this group” in explanatory
copy and “group person” in labels, API names, and documentation. Keep “my
shelf” for the private account view and “shared shelf” for the group view.
