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

This checklist does not replace the private operator release and rollback
procedure.

The first public repository baseline is `0.1.0-beta.1`. Use the `Unreleased`
section in [`CHANGELOG.md`](../CHANGELOG.md) for subsequent work, and create a
new tag only after the owner has approved visibility, history/privacy review,
deployment ownership, and the release contents.
