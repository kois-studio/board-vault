# Contributing

Thanks for helping improve Board Vault. Before opening a pull request:

1. read [`AGENTS.md`](AGENTS.md), the public documentation in [`docs/README.md`](docs/README.md),
   and the relevant product context;
2. work in a focused feature branch or separate Git worktree; do not commit
   directly to `main`;
3. keep changes focused and explain behavior or contract changes;
4. use the disposable local SQLite workflow and synthetic identities;
5. never commit `.env` files, credentials, database exports, browser storage,
   personal data, or provider payloads; and
6. run the relevant package checks and build checks.

Pull requests should describe migration and authorization impact, privacy
boundaries, and any follow-up work that cannot be verified locally. New API or
persistence behavior requires regression coverage and an updated public
contract where applicable.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Pull requests target `main`. GitHub requires one approval and all repository,
backend, frontend, and database CI checks. Coordinate changes to shared API
contracts and migrations with other contributors; see the development
workflow in [`docs/contributor-setup.md`](docs/contributor-setup.md).
