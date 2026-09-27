# Contributing

Thanks for helping improve Board Vault. Before opening a pull request:

1. read the public documentation in [`docs/README.md`](docs/README.md);
2. keep changes focused and explain behavior or contract changes;
3. use disposable local databases and synthetic identities;
4. never commit `.env` files, credentials, database exports, browser storage,
   personal data, or provider payloads; and
5. run the relevant package tests and build checks.

Pull requests should describe migration and authorization impact, privacy
boundaries, and any follow-up work that cannot be verified locally. New API or
persistence behavior requires regression coverage and an updated public
contract where applicable.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
