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
- `docs/` — current-state docs, how-to guides, ADRs, and the API contract.

## Development

```shell
npm run install:all
cp backend/.env.example backend/.env   # then add the development Clerk keys
npm run local:setup
```

Then run `npm run dev` in `backend/` and `npm start` in `frontend/`, and sign
in at <http://localhost:4200> as `organizer+clerk_test@example.com` with the
code `424242`. The full walkthrough is [`docs/onboarding.md`](docs/onboarding.md).

## Documentation and work

- [`docs/README.md`](docs/README.md): architecture, data model, how-to guides
- [`docs/AGENTS.md`](docs/AGENTS.md): rules and checks for humans and AI agents
- [GitHub Issues](https://github.com/kois-studio/board-vault/issues): the work queue

## Security

Do not commit credentials, tokens, local environment files, database exports,
or personal data. See [`SECURITY.md`](SECURITY.md) for reporting guidance.

## License

MIT. See [`LICENSE`](LICENSE).
