# Board Vault glossary

Use these terms consistently in UI copy, API descriptions, tests, and future
product decisions.

| Term | Meaning | Avoid saying |
| --- | --- | --- |
| Group | A private workspace for one recurring game group. It owns shared decisions, sessions, and memory. | Community, public club |
| Group person | A person represented inside one group (`GroupPerson`). It is either `linked` to a member's account, or a `placeholder` with no account until its owner claims it. The UI marks placeholders as “No account yet”. | Fake user, synthetic account, phantom member |
| Shelf | One account's private list of games they can bring, labelled “My Games” in the Collection section. It is not automatically visible as a global catalogue. | Library, catalogue |
| Shared shelf | The group view derived from member-owned games and group-scoped ownership records. It is the input to recommendations and planning. | Marketplace, public library |
| Session | One planned or completed game night. The API still contains historical `Meet` names for compatibility. | Event when discussing game-night state |
| Shortlist | The games a group has chosen to consider for a session. A shortlisted game is not necessarily played. | Final selection |
| Played | A game recorded as actually played during a session. This is the source for history and memory. | Planned, attended |
| Skipped | A game that was planned or shortlisted but was not played. It remains useful context and is not deleted history. | Failed, removed |
| History | The durable record of completed sessions, games, participants, and notes that helps the group decide later. | Activity feed |
| Interest | A member's explicit signal that the group should consider acquiring a game nobody in the group currently owns. | Wishlist, purchase intent |
| Decision | The group owner's current resolution for an acquisition candidate: open, planned, or not now. It is a group coordination state, not a purchase record. | Order, transaction |

When a phrase must be shortened, prefer “person in this group” in explanatory
copy and “group person” in labels, API names, and documentation. In the UI the
private list is “My Games” inside the “Collection” section; in documentation
and API descriptions keep “shelf” for it and “shared shelf” for the group view.

## Pricing and currency boundary

Board Vault does not currently display purchase prices or claim to support a marketplace currency model. The group acquisition board records shared interest and a group decision only; it never represents a price, payment, retailer offer, or purchase commitment.

Any future price UI must first define the supported locale and currency, the authoritative price source, the timestamp/expiry semantics, tax and shipping treatment, and the fallback when a price is unavailable. Until that decision is documented and implemented, product surfaces must not show a hard-coded currency symbol or purchase amount.
