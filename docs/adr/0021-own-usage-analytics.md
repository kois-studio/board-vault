# ADR: Usage analytics of our own

- **Status:** Accepted
- **Date:** 2026-10-16
- **Supersedes:** None
- **Superseded by:** None

## Context

We don't know which parts of Board Vault people use, from which screen they
reach them, or where a flow is left half done (a night planned but never
finished, a game played but never rated). Request logs can't answer that:
they are kept for about an hour on the Vercel Hobby plan and say nothing about
screens.

Third-party product analytics (PostHog, Google Analytics, Plausible) would
answer it, but they add a dependency and send what people do to someone else.
Most of them also store an identifier in the browser, which needs consent and
a cookie banner under ePrivacy. Board Vault has no banner and wants to keep it
that way.

This is not the group history (ADR-0020). The history is part of the product
and names who did what. Analytics is only for us, and only in aggregate.

## Decision

### What is recorded

`UsageEvent` holds one row per event: a `name` from a fixed list, a
`pseudonym`, the screen it happened on (`view`), and for page views the
screen before it (`fromView`). Screens are Angular route templates such as
`/groups/:groupId`, never addresses with ids in them; the API rejects
anything that isn't a template.

- **Actions** are recorded by the API after a request succeeds, by one
  interceptor that maps route templates to event names (`game_added`,
  `review_saved`, `session_planned`, `session_started`, `session_finished`,
  `results_recorded`, `group_created`, `group_joined`, …). The account's first
  sign-in records `account_created`. The browser sends the screen it is on in
  an `X-Board-Vault-View` header, so an action knows where it came from.
- **Page views** are the only thing the browser sends on purpose:
  `POST /navigation` with the page and the previous page, while signed in.
  The landing page and other public pages record nothing.

No email, name, id, free text, IP address or user agent is stored.

### Pseudonym, not identity

The pseudonym is an HMAC-SHA256 of the account id with a server secret
(`USAGE_PSEUDONYM_SECRET`), computed by the API. It lets a funnel follow one
person through several steps without storing who they are. While the secret
exists, the pseudonym is still personal data: we could recompute it. That is
why raw events are short-lived. Without the secret, nothing is recorded.

### No browser storage

Nothing is written to cookies or local storage for analytics. The pseudonym
comes from the signed-in account on the server, so there is nothing to
consent to in the browser and no banner. The previous page lives only in
memory for the length of a visit.

### Retention

Raw events are deleted after 30 days. Before that, a daily job turns each
finished day into `UsageDaily` rows: counts of events and of distinct
pseudonyms per event name and screen. Those rows hold no pseudonym, account,
group or game, so they are anonymous and kept.

The job runs as a Vercel cron (`GET /internal/daily-maintenance`, once a day)
authorised by `CRON_SECRET`. A day that is missed is caught up the next time,
because raw events wait 30 days.

### Opting out

Settings → Privacy has "Help improve Board Vault", on by default. Turning it
off records the account in `UsageOptOut`, stops recording at once and deletes
that account's raw events. Deleting an account does the same. Aggregates
already made stay, because they no longer belong to anyone.

New accounts are told when they sign up, with the switch right there (#158,
added 2026-10-16): the invitation sign-up form has it, already on, with a
short explanation and a pointer to Settings. That is the moment GDPR Articles
13 and 21(4) ask for: told when the data is collected, with the right to
object shown clearly and on its own. A card asking every signed-in account
was tried and removed the next day: an extra banner on Home costs more than
it tells people who can already find the switch in Settings.
When registration opens to everyone (#157), that sign-up needs the same
switch.

The sign-up switch is not consent, and is not worded as consent: the legal basis
stays legitimate interest. A switch that starts on is fine as an opt-out; as
consent it would be invalid (CJEU, Planet49). The tone is a small indie team
asking for a hand, and saying no is the same single tap, never a guilt trip
(the EDPB counts emotional steering as a deceptive design pattern). We rejected an opt-in: at our size almost
nobody turns one on (Firefox saw about 2%), and the funnels would be empty.

### Legal basis

Legitimate interest: knowing which features are used and where flows break,
to improve the product for the same people. The balance:

- the data is minimal (event names and screen templates);
- it is pseudonymous, and raw events last 30 days;
- it never leaves our own database and is read only by admins, as aggregates
  and funnels;
- there is no profiling and no tracking across sites;
- it is explained when someone joins and in Settings, with an opt-out one
  click away.

The EDPB's guidelines 2/2023 read ePrivacy broadly. Even so, this setup
stores nothing on the device, and it meets the conditions several regulators
set for exempt audience measurement: first-party, aggregate, limited in time,
disclosed and with an opt-out. This is our reading, not legal advice.

### What admins see

`GET /admin/usage` (admins only) and Administration → Usage show:

- the last 30 days: people and events per day;
- the most visited pages, and the most common ways into each;
- the actions and the screens they came from;
- two funnels: getting started (account → first game → a group → a night) and
  game night (planned → started → finished → rated);
- monthly totals from the daily counts.

## Consequences

- A new route that should count as an action needs an entry in the
  interceptor's map. A route that isn't listed is never recorded.
- A failure to record is logged and never fails the request.
- Each recorded action is one extra insert, after the response has been
  computed.
- Production needs `USAGE_PSEUDONYM_SECRET` and `CRON_SECRET`. Changing the
  pseudonym secret starts every pseudonym afresh; funnels across the change
  break, and nothing else does.

## Rejected alternatives

- **PostHog, Plausible or Google Analytics.** A dependency we don't need,
  data with a third party, and for most of them browser storage and a banner.
- **An id in local storage or a cookie.** It needs consent, so a banner.
- **A pseudonym secret that rotates monthly.** Raw events are deleted at 30
  days anyway, and a fixed secret lets account deletion find and delete that
  account's events at once.
- **Fully anonymous events.** Funnels need to follow one person through
  steps; daily counts can't do that.
