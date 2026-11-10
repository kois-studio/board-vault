# ADR: The public privacy notice and how people reach us

- **Status:** Accepted
- **Date:** 2026-11-10
- **Supersedes:** None
- **Superseded by:** None

## Context

Registration opened on 2026-11-10 (#157). Before that, Board Vault had real
users and no privacy notice (GDPR Art. 13), and no public way to reach whoever
runs it. #153 added `/privacy` in the five interface languages, plus contact
links in the footer, the profile menu, sign-up and Settings → Privacy
(PR #236). The text was reviewed with a second model over four rounds, until
both agreed on every point.

Board Vault is free, has no revenue, and is run by one person in Spain under
the name Kois Studio, which is not a registered company.

## Decision

- **Controller:** the notice names the natural person responsible for the
  data, in Spain, and one contact address, `contact@kois.app`
  (`frontend/src/app/core/contact.ts`). No postal address or tax ID: there is
  no economic activity, so Spain's LSSI doesn't apply.
- **Plain language, proportionate:** the page states only what the code does,
  and every sentence is a promise to keep. Retention is given once, by period
  or by criteria. Backups say "kept only while needed to undo a mistake",
  with no invented number of days.
- **Providers by name:** Clerk, Vercel, Turso and Upstash, each with its
  location and transfer mechanism. The inbox provider is named only as a
  category ("our email provider in Switzerland"). Where a mechanism isn't
  verified, the page says so instead of guessing (Turso, #285).
- **People without an account:** what group members record about them is
  covered by the public notice (Art. 14), on the groups' legitimate interest.
  Board Vault never holds their contact details and never contacts them:
  invitations are by username only (#277).
- **No cookie banner:** the only cookies are Clerk's sign-in cookies and the
  language cookie, and browser storage holds preferences the user picked.
  Usage statistics write nothing to the browser (ADR-0021).
- **Changing the notice:** any change to what Board Vault keeps, shows or
  shares updates `/privacy` in the same pull request, together with its date.
  People are told before their data is used for a new purpose.

## Consequences

- A new provider, a new kind of data, or a new retention period is a privacy
  change: update the page and its five translations, and check this ADR.
- If Kois Studio is ever registered as a company, `DATA_CONTROLLER` in
  `contact.ts` and this ADR change.
- Open points are tracked in #285: Turso's transfer safeguard, and processor
  agreements with Vercel and Turso.
