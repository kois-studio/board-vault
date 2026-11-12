# ADR: Problem reports of our own

- **Status:** Accepted
- **Date:** 2026-11-12
- **Supersedes:** None
- **Superseded by:** None

## Context

Since registration opened (#157), people we don't know use Board Vault, and
we only learn that something broke if someone tells us. The app logged
errors to the console in development only, and nothing caught an error nobody
handled. The API logs its own failures, but Vercel's Hobby plan keeps logs
for about an hour, so a crash at night is gone by morning. The resilience
audit (#237) found failures that are invisible this way: pages whose code no
longer exists after a deploy, promises rejected with nobody listening, and
requests that time out.

## Decision

### Our own endpoint, not a hosted service

Problems go to our own API and database (David, 2026-11-12, #247), as usage
statistics do (ADR-0021). A hosted service such as Sentry would give better
tools, but it is one more processor to name on `/privacy` and to sign an
agreement with (#285), and it would see more than we need. At our size, a
list of what broke, how often, where and since when is enough.

### What is reported

- **From the app** (`POST /problems`): an error thrown that nobody caught
  (Angular's `ErrorHandler` and the window's `error` event), a promise
  rejection nobody handled, a page whose code could not be loaded, and an API
  call that, after its retry, timed out or got a 5xx. Not a 4xx (an answer),
  and not "no answer at all" (offline: the network, not Board Vault, and the
  report could not get through either).
- **From the API:** every exception the error filter did not expect (a 500),
  recorded after the response.

A report holds what broke (name, message, stack), the screen as a route
template, or the API route as a template with ids replaced by `:id`, the
status, the API's `requestId` (to find its log lines while they last), the
build (commit), the interface language and the browser as a family, major
version and system ("Firefox 133 · Windows").

### Nobody is named

No account id, pseudonym, IP address or user agent is stored. The API scrubs
every text again, whatever the browser sent: email addresses, sign-in tokens,
the query and fragment of addresses, UUIDs and numbers of four digits or
more. A rejected value that is not an error is described by its fields'
names, never their values. Reports are sent without credentials.

Because a report says nothing about anyone, it does not follow the usage
statistics switch: there is no one to opt out. The legal basis is legitimate
interest in keeping Board Vault working (GDPR Art. 6(1)(f)), and `/privacy`
says what is kept and for how long.

### Bounded

- One row per distinct problem per day (`ProblemReport`, keyed by `day` and a
  `fingerprint` of where and what, numbers left out), counting occurrences
  and keeping the latest sample. A loop that throws a thousand times is one
  row.
- The app sends the same problem once a visit, and at most 10 a visit.
- `POST /problems` needs no sign-in, because problems happen before sign-in
  finishes, on public pages, and when sign-in itself fails. It is limited to
  30 reports per address per 10 minutes, and a day adds at most 300 distinct
  problems; past that, only problems already seen that day are counted.
- The daily job deletes rows older than 30 days.

Only production builds send reports. While developing, the console shows the
problem.

### Where they are read

Administration → Problems (`GET /admin/problems`, admins only): the last 30
days, one entry per problem with its days added up, most recent first.

## Consequences

- Production needs nothing new: the build and the API read
  `VERCEL_GIT_COMMIT_SHA`, which Vercel sets.
- A new field in a report reaches the API before the app sends it: the API
  refuses fields it does not know.
- The error filter takes the `ProblemsService` in `main.ts`; a test that
  builds its own filter without it only logs.
- Anyone can send made-up reports. The limits keep that from growing the
  table or crowding out real problems for long, and an admin reads them as
  hints, not as facts.

## Rejected alternatives

- **Sentry or another hosted service (EU region).** Better grouping and
  source maps, but a new processor for data we can keep ourselves.
- **Following the usage statistics switch.** It would hide problems from
  exactly the people who turned statistics off, for no privacy gain: the
  reports name nobody.
- **One row per occurrence.** Simpler, but a single loop could fill the
  table; counting per day keeps it bounded.
