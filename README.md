# Board Vault

Board Vault is a group-centered board-game companion. It combines private game
collections with shared groups, ownership and preference signals, explainable
recommendations, invitations, and session history.

## Current status

This is a public codebase under active development. The product is still a
private, invitation-only beta: this repository does not promise a hosted
service, open self-registration, or production support. Run it locally with
synthetic data and disposable development credentials until the deployment and
privacy model is explicitly documented.

Board Vault is not a complete board-game catalogue, marketplace, social
network, or managed SaaS. It is a group decision-and-memory tool: a private
personal shelf stays distinct from the shared context of a group and its
session history.

The repository contains:

- `frontend/` — the Angular web client;
- `backend/` — the NestJS API;
- `database/` — versioned schema, migrations, and disposable verification
  tooling;
- `docs/` — public architecture decisions and API contracts.

## Development

Install the workspace dependencies and copy the example environment files:

```shell
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill the local files with disposable development values. Never commit them.
The variable names and provider boundaries are documented in
[`docs/README.md`](docs/README.md).

Run the main checks from the repository root:

```shell
npm test
npm run build
```

Package-specific commands are available in `backend/package.json` and
`frontend/package.json`.

## Documentation

Start with [`docs/README.md`](docs/README.md), then review the API contract in
[`docs/api/openapi.json`](docs/api/openapi.json) and the accepted decisions in
[`docs/adr/`](docs/adr/).

## Security

Do not commit credentials, tokens, local environment files, database exports,
or personal data. See [`SECURITY.md`](SECURITY.md) for reporting guidance.

## License

MIT. See [`LICENSE`](LICENSE).
