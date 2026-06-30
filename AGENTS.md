# AGENTS.md - quorum-slack-agent

## Repo Role

`quorum-slack-agent` is the Quorum decision-memory Slack app built for the
Slack Agent Builder Challenge. It detects decision-bearing Slack threads,
drafts structured Decision Records, waits for human approval, writes approved
records to Slack-native destinations, and answers decision-memory queries with
sourced links.

## Boundaries

- Owns the Quorum app, packages, workflows, Slack manifest, demo scripts, and
  repo-local docs.
- Does not own estate-wide memory, Cosmocrat policy, Orion Runtime, or shared
  Slack infrastructure.
- Keep Slack mutations human-approved and scoped to the app behavior described
  in `README.md` and `docs/`.

## Authority Order

1. `/home/orion/src/orion-estate/platform/orion-estate-audit/AGENTS.md`
2. `README.md`
3. `docs/ARCHITECTURE.md` and `docs/DEMO.md`
4. Source tree, tests, package scripts, and Slack manifest

## Validation

Use the repo's pnpm scripts:

```bash
pnpm install
pnpm test
pnpm test:int
pnpm typecheck
```

For docs-only changes, run `git diff --check` at minimum.
