# Quorum — Decision Memory Agent

> The decision memory for your Slack workspace. Quorum detects when a thread reaches a
> decision, drafts a structured **Decision Record**, waits for a human to approve it, files it to
> a canonical **Decision Log** (Canvas + `#decision-log`), and answers *"what did we decide about
> X?"* with sourced, permalink-cited answers.

Built for the **Slack Agent Builder Challenge** (New Slack Agent track).

## Why it's different

Slack tools summarize conversations; none capture durable decision **provenance** (what / why /
who / superseding what) and make it **retrievable** against fresh, permission-scoped context.
Quorum does — and it uses all three required hackathon technologies, each load-bearing:

| Tech | Where it's used |
|---|---|
| **Slack AI / Agent** | `Assistant` agent surface + a `DurableAgent` for grounded Q&A |
| **MCP server integration** | Files records to a Slack **Canvas** + `#decision-log` via the hosted Slack MCP server (`mcp.slack.com`) |
| **Real-Time Search (RTS) API** | `assistant.search.context` grounds answers in fresh, permission-scoped Slack content with permalink citations |

Plus **Vercel Workflow** for durable human-in-the-loop: the approval step suspends for *hours* at
zero compute, then resumes exactly where it paused when someone clicks Approve.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Hybrid by design:

- **Capture pipeline** → deterministic `"use workflow"` (draft → durable approval hook → file).
- **Q&A** → `DurableAgent` (records-first, RTS fallback).
- **Storage** → Slack-native (Canvas + `#decision-log`). No external DB.

## Stack

pnpm monorepo · `workflow@4.3.1` + `@workflow/ai` · Next.js 15.5 + `@slack/bolt` +
`@vercel/slack-bolt` · AI SDK v6 (`ai`) + `@ai-sdk/mcp` · zod v4 · vitest (+ `@workflow/vitest`).

```
apps/web/        Next.js on Vercel — Bolt VercelReceiver (HTTP events), routes, health
workflows/       "use workflow" capture pipeline + DurableAgent Q&A + "use step" steps
packages/shared/ DecisionRecord schema, Block Kit + Canvas formatters, citations
packages/slack/  signature verify, RTS client, MCP client factory
```

## Local development

```bash
pnpm install
cp .env.sample apps/web/.env.local   # fill in tokens, or leave QUORUM_FAKE_LLM=1 for offline
pnpm test         # unit (19)
pnpm test:int     # workflow pause/resume integration (2)
pnpm typecheck
QUORUM_FAKE_LLM=1 pnpm dev            # Next dev; agent runs offline with deterministic LLM
```

`QUORUM_FAKE_LLM=1` makes every LLM + network step return deterministic canned data, so the whole
suite and a local run work with **no API keys**.

## Deploy

See [docs/DEMO.md](docs/DEMO.md) for the full deploy + demo runbook. In short:

1. `vercel deploy` (region `iad1`), set `SLACK_*` + `AI_GATEWAY_API_KEY` env vars.
2. Replace `REPLACE_WITH_DEPLOY_URL` in [slack-manifest.json](slack-manifest.json), apply it to
   your Slack app, reinstall to the sandbox.
3. Enable **Agents & AI Apps → Model Context Protocol** on the app (MCP).
4. Grant sandbox access to `slackhack@salesforce.com` and `testing@devpost.com`.

## Tests

- **Unit** (`pnpm test`): schema, formatters, citations, signature verify, RTS client, MCP file
  helper, classify/draft/file/search steps.
- **Integration** (`pnpm test:int`): the capture workflow actually suspends at the approval hook
  and resumes on approve; the 7-day expiry branch wins the race when no one approves.
