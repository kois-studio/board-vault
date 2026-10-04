# Audit rendered pages

CI runs Lighthouse on the production build of the frontend in every run of
the frontend job: on each push to `main` and on each manual run on a branch,
so a release is always audited. The configuration is
[`frontend/lighthouserc.json`](../../frontend/lighthouserc.json).

## What is audited

- `/` (landing), `/login` and `/register`, three runs each, on Lighthouse's
  default mobile profile. The build is served by
  [`frontend/scripts/serve-dist.mjs`](../../frontend/scripts/serve-dist.mjs)
  with gzip and the app-route fallback, as Vercel does.
- `is-crawlable` is skipped: the private beta asks search engines not to index
  it on purpose.
- CI builds have no Clerk key, so the "errors in console" check fails there
  and costs a few best-practice points. Production does not have that error.

Signed-in pages are not in Lighthouse because CI has no account. Their
accessibility checks run with Playwright against the development Clerk
instance (`e2e/rendered-core-audit.spec.ts`, see
[run-with-clerk.md](run-with-clerk.md)).

## Thresholds

The job fails when the median run of any page drops below:

| Category | Minimum |
| --- | --- |
| Performance | 50 |
| Accessibility | 95 |
| Best practices | 90 |
| SEO | 90 |

Performance varies from run to run on shared CI machines (62 to 76 across
the first run's nine audits), so its floor sits well under the baseline and
catches large regressions only. Treat the scores
as signals; a passing score does not mean a page is accessible.

## Baseline (CI, October 2026)

Median of three runs on the GitHub runner:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 75 | 100 | 96 | 100 |
| `/login` | 76 | 100 | 96 | 100 |
| `/register` | 65 | 100 | 96 | 100 |

Open findings: [#72](https://github.com/kois-studio/board-vault/issues/72) (public pages paint slowly on mobile).

## Read a report

Download the `lighthouse-reports` artifact from the CI run. It has an HTML
and a JSON report for every run; `manifest.json` marks the median run of each
page.

## Run it locally

From `frontend/`, with Chrome installed:

```sh
CLERK_PUBLISHABLE_KEY= bun run build
bunx @lhci/cli@0.15.1 autorun --collect.numberOfRuns=1
```

Leaving the key empty matches CI. Lighthouse uses a lot of CPU; one run per
page is enough to check a change.

Don't lower a threshold to make a failure go away. Fix the regression, or
record why the new baseline is expected and agree it in the issue.
