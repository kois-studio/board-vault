# Allow an audit advisory

CI audits the backend and frontend dependencies at every severity with
`scripts/audit-dependencies.mjs`. It runs `npm audit` and fails on any
advisory, except the ones listed in `audit-allowlist.json` at the root.

Run it yourself from `backend/` or `frontend/`:

```sh
node ../scripts/audit-dependencies.mjs
```

## When an advisory may be allowed

Fix it instead whenever you can: update the package, or pin a fixed version
under `overrides` in that project's `package.json`. Allow it only when both
hold:

- No fixed version exists (the advisory has no first patched version).
- It does not reach production: `npm audit --omit=dev` is clean in that
  project.

## How

Add an entry to `audit-allowlist.json`: the advisory's `GHSA-…` id, the
package, why it is safe for now, and a `reviewBy` date about a month away.
After that date CI fails on it again, so someone looks at it again: renew it
with a new date and reason, or fix it.

Remove the entry once a fixed version ships and the projects use it. The
script says when an allowed advisory is no longer reported.
