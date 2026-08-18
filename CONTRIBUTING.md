# Contributing to Tickmark

Thanks for considering a contribution. Tickmark is early and the surface area is still small, so this
doc is intentionally short.

## Development setup

```bash
pnpm install
cp .env.example .env
# point DATABASE_URL at a local Postgres, then:
pnpm db:generate   # already generated in packages/db/drizzle, re-run after schema changes
pnpm db:migrate
pnpm db:seed
pnpm dev           # starts apps/web on :3000
pnpm demo          # in another terminal, runs the instrumented demo agent
```

See the [README](./README.md) Quickstart for the full walkthrough.

## Project layout

- `packages/db` — Drizzle schema, migrations, and the audit hash-chain.
- `packages/evaluators` — the evaluator interface and built-in evaluator pack. This is the highest-value
  place to contribute: new finance-specific evaluators, better heuristics for existing ones, or
  additional unit tests.
- `packages/sdk` — the tracing SDK (`traceable()`, span/trace capture, ingestion client).
- `apps/web` — the dashboard and API routes.
- `apps/demo-agent` — the instrumented example agent and dataset seed script.

## Before opening a PR

```bash
pnpm turbo run lint typecheck test
```

All three should pass. New evaluators should ship with unit tests covering both a passing and a failing
case (see `packages/evaluators/src/evaluators/*.test.ts` for the pattern).

## Adding an evaluator

1. Add `packages/evaluators/src/evaluators/your-evaluator.ts` implementing the `Evaluator` interface
   from `packages/evaluators/src/types.ts`.
2. Export it from `packages/evaluators/src/evaluators/index.ts` and register it in
   `packages/evaluators/src/registry.ts`.
3. Add `your-evaluator.test.ts` next to it with at least a pass and a fail case.

## Reporting issues

Open a GitHub issue with a clear description and, where relevant, the smallest reproducible example
(a dataset example + evaluator name is usually enough).
