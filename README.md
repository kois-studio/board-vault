# Board Vault

Board Vault is a group-centered board-game companion. It combines private game
collections with shared groups, ownership and preference signals, explainable
recommendations, invitations, and session history.

## Current status

This is a public repository under active development. The product is still a
private, invitation-only beta: this repository does not promise a hosted
service, open self-registration, or production support. Run it locally with
synthetic data and disposable development credentials. The deployed service
and production data are separate from this local setup.

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

Install the backend and frontend dependencies, then prepare the local SQLite
database:

```shell
npm run install:all
cp backend/.env.example backend/.env
npm run local:setup
```

The backend example is ready for local-only development. The reset creates a
disposable database and synthetic accounts; it does not connect to Turso,
Clerk, Resend, or Upstash. Keep `backend/.env` private. See
[`docs/contributor-setup.md`](docs/contributor-setup.md) for login details,
optional Clerk development setup, and the parallel contribution workflow.

Run the main checks from the repository root:

```shell
npm run test:unit
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
