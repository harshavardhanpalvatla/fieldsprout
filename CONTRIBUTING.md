# Contributing to FieldSprout

## Development setup

Follow the [Getting started](README.md#getting-started) steps in the README first.

## Branch conventions

| Branch | Purpose |
|---|---|
| `main` | Production-ready code |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Tooling, deps, config |

## Commit message format

```
type: short description

Longer explanation if needed.
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

## Adding a new API module

1. Generate a NestJS module: `npx nest g module <name>` inside `apps/api/src/`
2. Add the Prisma model to `apps/api/prisma/schema.prisma`
3. Run `npm run migrate --workspace=apps/api` to create the migration
4. Export any shared types from `packages/types/src/index.ts`
5. Add Zod schemas to `packages/validation/src/` if the endpoint accepts a body

## Database changes

- Never edit migration files after they've been committed
- Always create a new migration: `npx prisma migrate dev --name <description>` inside `apps/api/`
- Update the seed file if new required data is introduced

## Code style

- TypeScript strict mode is enabled across all apps — no `any`
- API controllers stay thin; business logic lives in services
- Reuse types from `@fieldsprout/types` and schemas from `@fieldsprout/validation`

## Pull requests

- Keep PRs focused — one feature or fix per PR
- Include a short description of what changed and why
- Ensure `npm run build` passes for the affected workspace before opening a PR
