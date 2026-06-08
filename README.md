# Quorum — Decision Memory Agent

The decision memory for your Slack workspace. Quorum detects when a thread reaches a
decision, drafts a structured **Decision Record**, waits for a human to approve it, files it to
a canonical **Decision Log** (Canvas + `#decision-log`), and answers *"what did we decide about
X?"* with sourced, permalink-cited answers.

Built for the **Slack Agent Builder Challenge** (New Slack Agent track).

**Live:** https://quorum-slack-agent.vercel.app · **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · **Deploy + demo runbook:** [docs/DEMO.md](docs/DEMO.md)

## Why it's different

Slack tools summarize conversations; none capture durable decision **provenance** (what / why /
who / superseding what) and make it **retrievable** against fresh, permission-scoped context.
Quorum does — and it uses all three required hackathon technologies, each load-bearing:

| Tech | Where it's used |
|---|---|
| **Slack AI / Agent** | A Vercel `DurableAgent` answers `@Quorum` mentions and the `/decisions` slash command with grounded, cited Q&A |
| **MCP server integration** | Files records to a Slack **Canvas** + `#decision-log` via the hosted Slack MCP server (`mcp.slack.com`) |
| **Real-Time Search (RTS) API** | `assistant.search.context` grounds answers in fresh, permission-scoped Slack content with permalink citations |

Plus **Vercel Workflow** for durable human-in-the-loop: the approval step suspends for up to
**7 days** at zero compute, then resumes exactly where it paused when someone clicks Approve.

## What's working today

Verified against the live deployment and the test suite:

- **Capture** — the `📌 Capture decision` message shortcut on any thread starts a durable capture
  workflow that drafts a Decision Record and posts an approval card.
- **Proactive nudge** (off by default) — Quorum classifies messages in allowlisted channels and,
  on a high-confidence decision, posts an ephemeral "capture this decision?" button. Gated behind
  `QUORUM_NUDGE_CHANNELS`; an empty allowlist disables it so there is no spam.
- **Human-in-the-loop approval** — the approval card has **Approve / Edit / Discard** buttons. Edit
  opens a modal to revise title / decision / rationale before approval; all three resume the durable
  workflow hook.
- **Filing** — on approval the record is filed to a Slack Canvas and the `#decision-log` channel
  through the hosted Slack MCP server.
- **Grounded Q&A** — `@Quorum <question>` (in-thread) and `/decisions <question>` run a `DurableAgent`
  that searches filed records first, then falls back to Slack Real-Time Search with permalink citations.
- **Live deploy** — `GET /api/health` returns `{"ok":true,"service":"quorum",...}` (HTTP 200) at the
  URL above.

## Known limitations

- **No Slack Assistant pane handler.** The manifest declares `assistant_view` and subscribes to the
  `assistant_thread_started` / `assistant_thread_context_changed` events, but no listener consumes
  them yet. Q&A is surfaced through `@Quorum` mentions and `/decisions`, not a dedicated Assistant pane.
- **Single-sandbox demo grade.** The in-process nudge dedup set and the monotonic record-id counter
  live in memory and reset across restarts. Fine for one sandbox; not multi-instance safe.
- **No external database.** Storage is Slack-native (Canvas + `#decision-log`). There is no separate
  persistence layer.
- **No license file.** See [License](#license).

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Hybrid by design:

- **Capture pipeline** → deterministic `"use workflow"` (draft → durable approval hook → file).
  The approval step races `approvalHook.create({ token })` against `sleep("7d")`; whichever resolves
  first decides the outcome.
- **Q&A** → `DurableAgent` with two tools: `searchRecords` (filed records first) and `searchWorkspace`
  (RTS fallback).
- **Storage** → Slack-native (Canvas + `#decision-log`). No external DB.

Design and spike notes: [docs/superpowers/specs/2026-06-06-decision-memory-agent-design.md](docs/superpowers/specs/2026-06-06-decision-memory-agent-design.md),
[docs/superpowers/plans/2026-06-06-quorum.md](docs/superpowers/plans/2026-06-06-quorum.md),
[docs/SPIKE-mcp.md](docs/SPIKE-mcp.md).

## Stack

pnpm monorepo (`pnpm@9.12.0`) · `workflow@4.3.1` + `@workflow/ai` (`DurableAgent`) · Next.js 15.5.19
(App Router) + React 19 · `@slack/bolt` + `@vercel/slack-bolt` (`VercelReceiver`) · Vercel AI SDK v6
(`ai`) + `@ai-sdk/mcp` + `@modelcontextprotocol/sdk` · zod v4 · vitest (+ `@workflow/vitest`) ·
Vercel AI Gateway (Anthropic Claude Sonnet 4.5 / Haiku 4.5) · hosted Slack MCP (`mcp.slack.com`) +
Real-Time Search (`assistant.search.context`). Deployed on Vercel (region `iad1`).

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

To seed a demo decision thread (messy Postgres-vs-Mongo debate) into a channel for the video:

```bash
SLACK_BOT_TOKEN=xoxb-... DEMO_CHANNEL_ID=C... pnpm demo
```

## Environment variables

All keys are listed with placeholders in [.env.sample](.env.sample). Never commit real values.

| Variable | Required | Purpose |
|---|---|---|
| `SLACK_BOT_TOKEN` | yes | Bot token (`xoxb-…`) for posting, canvases, MCP, search |
| `SLACK_USER_TOKEN` | yes | User token (`xoxp-…`) for RTS private-channel search scopes |
| `SLACK_SIGNING_SECRET` | yes | Verifies inbound Slack request signatures |
| `SLACK_TEAM_ID` | yes | Workspace id (`T…`) |
| `DECISION_LOG_CHANNEL_ID` | yes | `#decision-log` channel id (`C…`) |
| `DECISION_LOG_CANVAS_ID` | yes | Canonical Decision Log Canvas id (`F…`, created once) |
| `AI_GATEWAY_API_KEY` | yes | Vercel AI Gateway key |
| `QUORUM_MODEL` | no | Drafting/Q&A model (default `anthropic/claude-sonnet-4.5`) |
| `QUORUM_CLASSIFIER_MODEL` | no | Decision classifier model (default `anthropic/claude-haiku-4.5`) |
| `QUORUM_NUDGE_CHANNELS` | no | Comma-separated channel allowlist for proactive nudges; empty disables them (default) |
| `QUORUM_FAKE_LLM` | no | `1` returns deterministic canned data; runs offline with no API keys |

## Deploy

See [docs/DEMO.md](docs/DEMO.md) for the full deploy + demo runbook. In short:

1. `vercel deploy` (region `iad1` — Vercel Workflow World requirement), set the env vars above
   (`SLACK_*`, `DECISION_LOG_*`, `AI_GATEWAY_API_KEY`, model overrides). Leave `QUORUM_FAKE_LLM`
   unset in production.
2. Apply [slack-manifest.json](slack-manifest.json) to your Slack app and reinstall to the sandbox.
   The manifest is already pointed at `https://quorum-slack-agent.vercel.app`; if you deploy to a
   different domain, update the three request URLs (`slash_commands[].url`,
   `settings.event_subscriptions.request_url`, `settings.interactivity.request_url`) to match.
3. Enable **Agents & AI Apps → Model Context Protocol** on the app (`is_mcp_enabled`).
4. Create the Decision Log Canvas + `#decision-log` channel once; put their ids in env.
5. Grant sandbox access to judges (`slackhack@salesforce.com`, `testing@devpost.com`).

Independent runtime check after deploy: `curl https://<deploy>/api/health` → `{"ok":true,"service":"quorum",...}`.

## Tests

- **Unit** (`pnpm test`, 19 tests): schema, formatters, citations, signature verify, RTS client, MCP
  file helper, classify/draft/file/search steps.
- **Integration** (`pnpm test:int`, 2 tests): the capture workflow actually suspends at the approval
  hook and resumes on approve; the 7-day expiry branch wins the race when no one approves.

## Project structure

| Path | Holds |
|---|---|
| `apps/web/` | Next.js app on Vercel: Slack event/interaction/health routes, Bolt `VercelReceiver` factory, listeners |
| `workflows/` | `captureWorkflow` (`"use workflow"`), `qaWorkflow` `DurableAgent`, `"use step"` steps, approval hook |
| `packages/shared/` | `DecisionRecord` zod schema, Block Kit + Canvas formatters, citations |
| `packages/slack/` | Signature verify, RTS client, MCP client factory |
| `scripts/` | `seed-demo.ts` (`pnpm demo`) |
| `docs/` | Architecture, demo runbook, MCP spike, design spec + plan |

## License

No license file is currently included, so no usage terms are granted. If you intend others to use
or fork this repo, add a `LICENSE` (e.g. MIT).
