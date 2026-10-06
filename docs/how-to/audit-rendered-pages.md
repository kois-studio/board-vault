# Audit rendered pages

CI runs Lighthouse on the production build of the frontend in every run of
the frontend job: on each push to `main` and on each manual run on a branch,
so a release is always audited. The configuration is
[`frontend/lighthouserc.json`](../../frontend/lighthouserc.json).

## What is audited

- `/` (landing), `/login` and `/register`, three runs each, on Lighthouse's
  default mobile profile. The build is served by
  [`frontend/scripts/serve-dist.mjs`](../../frontend/scripts/serve-dist.mjs)
  with gzip and the app-route fallback, as Vercel does. It also serves a
  runtime config with a Clerk publishable key, as production has, so the
  audit downloads and runs Clerk's bundle. The key is fake: its frontend API
  is on `.invalid`, so Clerk's next request fails at once and no Clerk
  instance is contacted.
- `is-crawlable` is skipped: the private beta asks search engines not to index
  it on purpose.
- With the fake key Clerk cannot finish loading, so the "errors in console"
  check fails and costs a few best-practice points. Production does not have
  that error.

Signed-in pages are not in Lighthouse because CI has no account. Their
accessibility checks run with Playwright against the development Clerk
instance (`e2e/rendered-core-audit.spec.ts`, see
[run-with-clerk.md](run-with-clerk.md)).

## Thresholds

The job fails when the median run of any page drops below:

| Category | Minimum |
| --- | --- |
| Performance | 80 |
| Accessibility | 95 |
| Best practices | 90 |
| SEO | 90 |

Performance varies from run to run on shared CI machines (92 to 95 across
the nine audits of the baseline run), so its floor sits under the baseline and
catches real regressions, such as Clerk or a large library loading before the
first paint. Treat the scores
as signals; a passing score does not mean a page is accessible.

## Baseline (CI, October 2026)

Median of three runs on the GitHub runner:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 95 | 100 | 96 | 100 |
| `/login` | 95 | 100 | 96 | 100 |
| `/register` | 92 | 100 | 96 | 100 |

The first audit scored 65 to 76. [#72](https://github.com/kois-studio/board-vault/issues/72)
raised it by drawing the page before Clerk loads and bundling only the icons
in use. That baseline was measured without a Clerk key, and with one the
pages still scored about 76: Clerk was requested before the page's largest
paint, and `/login` and `/register` waited for it.
[#92](https://github.com/kois-studio/board-vault/issues/92) starts Clerk
after the first page has painted, stops `GuestOnlyGuard` waiting for it, and
bundles the landing page with the app. Locally, with a key, that gives 94 to
96 on all three pages and a landing LCP of 2.4 s, the same as without a key.

## Read a report

Download the `lighthouse-reports` artifact from the CI run. It has an HTML
and a JSON report for every run; `manifest.json` marks the median run of each
page.

## Run it locally

From `frontend/`, with Chrome installed:

```sh
bun run build
bunx @lhci/cli@0.15.1 autorun --collect.numberOfRuns=1
```

`serve-dist.mjs` serves its own fake Clerk key whatever key the build has,
so a local run matches CI. Lighthouse uses a lot of CPU; one run per page is
enough to check a change.

Don't lower a threshold to make a failure go away. Fix the regression, or
record why the new baseline is expected and agree it in the issue.
