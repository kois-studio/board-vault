# Audit rendered pages

CI runs Lighthouse on the production build of the frontend in every run of
the frontend job: on each push to `main` and on each manual run on a branch,
so a release is always audited. The configuration is
[`frontend/lighthouserc.json`](../../frontend/lighthouserc.json).

## What is audited

- `/en/` (landing), `/en/login` and `/en/register`, three runs each, on Lighthouse's
  default mobile profile. The build is served by
  [`frontend/scripts/serve-dist.mjs`](../../frontend/scripts/serve-dist.mjs)
  with gzip, the shared files at the root, each language's app-route
  fallback, and the redirect of an address without a language, as Vercel does. It also serves a
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

Performance varies from run to run on shared CI machines, so its floor sits
under the baseline and catches real regressions, such as Clerk or a large
library loading before the first paint. Treat the scores as signals; a
passing score does not mean a page is accessible.

## Bundle budget

`ng build` also checks the size of the initial bundle (`budgets` in
[`frontend/angular.json`](../../frontend/angular.json)): a warning above
1 MB, a failed build above 1.25 MB. Angular measures it uncompressed; what
a browser downloads is about a fifth of that (October 2026: 853 kB raw,
158 kB transferred). The budget is an alarm for a sudden jump, such as a
large library pulled into the first load by mistake, not a cap on features:
when normal growth reaches the warning, check what grew, then raise it with
some headroom. How fast pages load is judged by the Lighthouse thresholds
above.

## Baseline (CI, October 2026)

Median of three runs on the GitHub runner, with the fake Clerk key (after
[#92](https://github.com/kois-studio/board-vault/issues/92)):

| Page | Performance | Accessibility | Best practices | SEO | LCP |
| --- | --- | --- | --- | --- | --- |
| `/` | 88 | 100 | 96 | 100 | 2.3 s |
| `/login` | 91 | 100 | 96 | 100 | 2.6 s |
| `/register` | 89 | 100 | 96 | 100 | 2.8 s |

These are a few points below the earlier no-key baseline (95, 95, 92)
because the audit now downloads and parses Clerk's bundle after the first
paint, as production does.

The first audit scored 65 to 76. [#72](https://github.com/kois-studio/board-vault/issues/72)
raised it by drawing the page before Clerk loads and bundling only the icons
in use. That baseline was measured without a Clerk key, and with one the
pages still scored about 76: Clerk was requested before the page's largest
paint, and `/login` and `/register` waited for it.
[#92](https://github.com/kois-studio/board-vault/issues/92) starts Clerk
after the first page has painted, stops `GuestOnlyGuard` waiting for it, and
bundles the landing page with the app. Locally, with a key, that gives 94 to
96 on all three pages and a landing LCP of 2.4 s, the same as without a key.

Later the landing hovered at the performance floor on CI (76 to 85 on `main`,
69 to 80 on pull requests), with the same paint times and bytes in every run:
only Total Blocking Time moved, 400 to 1,200 ms. Lighthouse runs the page on a
CPU slowed down four times, and the landing was built in one task, about
65 ms on a fast machine, that it counted after the first paint. Now each of
the five feature samples is built only when it comes within half a screen of
view (`@defer (on viewport)` in `pages/landing`), with a placeholder of about
its height, so scrolling does not shift the page. Building less at first made
the page paint sooner than Clerk's download started, and Lighthouse then
counted that download before the paint, so Clerk now waits for the browser's
own `first-contentful-paint` entry instead of two animation frames. Locally
the first task went from 64 to 46 ms and the first layout from 48 to 28 ms;
the landing scores 91 to 92, its blocking time 150 to 174 ms instead of 169 to 234 ms.
A check that reads the samples, or takes a full-page screenshot, scrolls past
them first (`e2e/fixtures/landing.ts`).

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
