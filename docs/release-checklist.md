# Public release checklist

Before making a repository or release public:

- inspect the exact staged tree;
- scan the complete history and every public ref for secrets and private data;
- verify no environment file, database export, archive, dump, browser state,
  source map, local path, or private runbook is tracked;
- use reserved or synthetic values in examples and fixtures;
- run the backend, frontend, and disposable database checks;
- confirm provider credentials are stored outside Git and rotate any uncertain
  credential before release; and
- obtain owner approval for visibility, licensing, contributors' attribution,
  and deployment/recovery ownership.

Run `npm run check:public-tree` before staging a public change. It fails if the
tracked tree or staged patch contains environment files, generated runtime
configuration, build/test artifacts, browser state, database artifacts, or the
private UI review document.

Production rollout and rollback are in
[how-to/add-migration.md](how-to/add-migration.md#production-rollout-david-only)
and [how-to/recover-production.md](how-to/recover-production.md).

`0.1.0-beta.1` was the version in the changelog and the `package.json` files
for the first public development baseline. It was never created as a Git tag.
The first tag is `v0.1.0`, the public launch. Use the `Unreleased` section in
[`CHANGELOG.md`](../CHANGELOG.md) for subsequent work, and create a new tag
only after the owner has approved visibility, history/privacy review,
deployment ownership, and the release contents.

## Cutting a release

Tag a production milestone, such as a launch or a finished epic, not every
merge. While the version is `0.x`, bump the minor number for user-visible
features and the patch number for fixes. Tags use a `v` prefix (`v0.1.0`).

1. Move the `Unreleased` entries of [`CHANGELOG.md`](../CHANGELOG.md) into a
   new section named `X.Y.Z — YYYY-MM-DD`, grouped and trimmed as release
   notes, and leave an empty `Unreleased` above it. Update the `version` in
   the `package.json` files if they differ.
2. Go through the checklist above and run `npm run check:public-tree`.
3. Get the owner's approval of the release contents.
4. Merge to `main`, then create an annotated tag on the merge commit and push
   it: `git tag -a vX.Y.Z -m "Board Vault X.Y.Z"` and
   `git push origin vX.Y.Z`.
5. Publish a GitHub release from the section's notes:
   `gh release create vX.Y.Z --title "X.Y.Z" --notes-file <notes>.md`.
