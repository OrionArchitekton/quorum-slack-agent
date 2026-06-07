# Quorum — Decision Memory Agent (Design Spec)

**Date:** 2026-06-06
**Status:** Approved (brainstorm) → pending spec review
**Hackathon:** Slack Agent Builder Challenge (Salesforce/Slack, Devpost) — New Slack Agent track
**Deadline:** 2026-07-13 17:00 PDT

## 1. Problem & Thesis

Teams make their most important calls in Slack threads — architecture choices, postmortem
conclusions, policy changes — and those decisions then **vanish into scrollback**. Incumbent
tools summarize conversations; none capture durable *decision provenance* (what was decided,
why, by whom, superseding what) and make it *retrievable later* against live, permission-scoped
workspace context.

**Quorum** is a Slack agent that:

1. Detects when a thread reaches a decision (proactively or on demand),
2. Drafts a structured **Decision Record**,
3. Waits for a human to approve/edit it (durable human-in-the-loop),
4. Files the approved record to a canonical **Decision Log** (Slack Canvas + `#decision-log`),
5. Answers *"what did we decide about X?"* using the **Real-Time Search API**, grounded with
   permalink citations.

The concept is novel against the saturated Slack landscape (summaries, standups, generic
knowledge search) because it targets durable decision **provenance + retrieval**, not
transcription.

## 2. Goals / Non-Goals

### Goals
- Win on all four equally-weighted judging axes: Technical Implementation, Design/UX, Potential
  Impact, Quality of Idea. Strategy is **7/7/7/7 > 9/9/3/4** — a complete, polished, novel,
  narrow agent.
- Use **all three** required hackathon technologies, each load-bearing (not decorative):
  - **Slack AI / Agent** — Assistant class + agent surface.
  - **MCP** — Slack MCP server (`https://mcp.slack.com/mcp`) for Canvas + post + search actions.
  - **RTS** — `assistant.search.context` for grounded, permission-scoped retrieval.
- Produce a <3-minute demo with a clear **before/after** transformation and visible agent actions.

### Non-Goals (YAGNI for the hackathon)
- Slack Marketplace listing (Organizations track) — out of scope; New Slack Agent track has no
  Marketplace gate and the same $8k top prize.
- Multi-workspace distribution / OAuth install flow for arbitrary workspaces — single sandbox only.
- An analytics dashboard (decision velocity, etc.) — deferred; adds breadth-over-depth risk.
- External database — storage is Slack-native (see §5).

## 3. Architecture (Hybrid)

The system splits control flow by shape:

- **Capture pipeline → deterministic `"use workflow"`.** Linear human-in-the-loop: draft →
  approve → file. Reliability and durable suspend-for-approval are the whole point. Demo-safe.
- **Q&A → `DurableAgent` (`@workflow/ai`).** Branching reasoning ("search curated records, or
  run RTS over raw threads, or both?") is genuinely agentic and scores on the Technical axis.

```
                         Slack (sandbox workspace)
   message shortcut ┐         events ┐          /decisions ┐  @Quorum ┐
                    ▼                ▼                      ▼          ▼
        ┌───────────────────────── apps/web (Next.js on Vercel) ─────────────────────────┐
        │  @vercel/slack-bolt VercelReceiver (HTTP events, Fluid compute, waitUntil ACK)  │
        │   /api/slack/events            /api/slack/interactions                          │
        └───────┬───────────────────────────────┬──────────────────────────┬────────────┘
                │ start(captureWorkflow)         │ resumeHook(approve:…)     │ start(qaWorkflow)
                ▼                                 ▼                          ▼
   ┌─ workflows/capture.ts (use workflow) ─┐   (button click)     ┌─ workflows/qa-agent.ts ─┐
   │ fetchThread → draftRecord(LLM step)   │                      │ DurableAgent             │
   │ → postApprovalCard(MCP step)          │                      │  tools: searchRecords,   │
   │ → await hook ⟂ sleep("7d")            │◄─────────────────────│         searchWorkspace  │
   │ → fileRecord(MCP step) → confirm      │                      │  → synthesize + cite     │
   └───────────────────────────────────────┘                      └──────────────────────────┘
                │                                                          │
                ▼ MCP client (in step)                                     ▼ RTS client (in step)
        Slack MCP server: canvas.create/update, chat.postMessage     assistant.search.context
```

### Proactive detection path
Bolt subscribes to `message` events in channels where the app is present and the channel is
**opted in**. Each candidate message runs a cheap-model `classifyDecision` step. If likely a
decision, the app posts an **ephemeral** "Capture this decision?" button (zero channel noise,
no false-positive spam). Clicking it `start()`s the capture workflow.

## 4. Components (units, each independently testable)

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `apps/web` routes | Verify Slack signature, ACK in 3s, dispatch to workflows | `@slack/bolt`, `@vercel/slack-bolt`, `workflow/api` |
| `workflows/capture.ts` | Deterministic capture→approve→file orchestration | steps, `hooks/approval` |
| `workflows/qa-agent.ts` | Agentic grounded Q&A | `@workflow/ai`, slack RTS/MCP tools |
| `workflows/hooks/approval.ts` | `defineHook({schema})` for approve/edit payloads | `workflow` |
| `workflows/steps/draft.ts` | LLM drafts a `DecisionRecord` from a thread | AI SDK, `packages/shared` |
| `workflows/steps/classify.ts` | Cheap-model "is this a decision?" classifier | AI SDK |
| `workflows/steps/file.ts` | MCP: append Canvas + post to `#decision-log` | `packages/slack` MCP client |
| `workflows/steps/search.ts` | RTS `assistant.search.context` wrapper | `packages/slack` RTS client |
| `packages/shared` | `DecisionRecord` type + zod schema, Block Kit + Canvas formatters, citation builder | zod |
| `packages/slack` | MCP client factory, RTS client, signature verification | `@ai-sdk/mcp`, `@modelcontextprotocol/sdk` |

**Boundary test:** each unit can be described as (what / how to use / depends on) without reading
internals; `packages/shared` formatters and `steps/*` are pure-ish functions testable in
isolation with `FAKE_LLM=1`.

## 5. Data Model & Storage (Slack-native)

**Decision Record:**
```ts
type DecisionRecord = {
  id: string;                 // stable slug, e.g. "DR-2026-0042"
  title: string;              // one-line headline
  decision: string;          // what was decided
  rationale: string;         // why
  participants: string[];    // Slack user IDs involved
  decidedAt: string;         // ISO timestamp
  sourcePermalink: string;   // link back to the originating thread
  status: "proposed" | "accepted" | "superseded";
  tags: string[];
  supersedes?: string;       // id of a prior record this replaces
};
```

**Source of truth = Slack itself.** On approval:
1. A structured message is posted to `#decision-log` (so RTS indexes each record discretely for
   precise retrieval), and
2. The record is appended as a section to the canonical **Decision Log Canvas** (human-browsable
   index), via the Slack MCP server.

No external DB. The only non-Slack state is **in-flight workflow run state** (managed by the
Workflow world), which holds pending approvals — not the canonical records.

## 6. Error Handling & Safety

- **3-second ACK:** `@vercel/slack-bolt` `waitUntil` + Fluid compute. Slack is ack'd immediately;
  work continues in the background workflow.
- **Approval expiry:** `Promise.race([approvalHook, sleep("7d")])`; on timeout the draft is marked
  expired and the card is updated (no silent dangling).
- **RTS rate limits** (10 req/min default + 10/min per-user): client-side throttle + backoff;
  `FatalError` on 4xx, `RetryableError` on 429/5xx.
- **LLM draft/classify failure:** thrown as `RetryableError` → step auto-retries (≤3×); persistent
  failure surfaces a "couldn't draft — capture manually?" fallback card.
- **Idempotency:** capture is keyed by `{channel}:{threadTs}`; a second trigger on the same thread
  updates the existing in-flight run rather than double-filing.
- **Permission scoping:** RTS already returns only what the *calling user* can see. Proactive
  detection runs only in channels where the app is present **and** explicitly opted in.
- **Signature verification:** every inbound Slack request verified via signing secret before any work.
- **MCP placement:** MCP client (network I/O) is created and used **only inside `"use step"`**,
  never in the `"use workflow"` sandbox. Hook *creation* stays in workflow context.

## 7. Testing Strategy

Mirrors the `proctor` repo conventions:
- **Unit (`vitest`):** `packages/shared` formatters, citation builder, classifier prompt assembly,
  record schema validation — plain functions, no server.
- **Integration (`@workflow/vitest`):** capture workflow end-to-end with `start` + `waitForHook` +
  `resumeHook` (approve path) and `sleep` wake (expiry path); asserts Canvas/`#decision-log`
  side-effects via mocked MCP client.
- **Fake-LLM mode:** `QUORUM_FAKE_LLM=1` returns deterministic drafts/classifications (like
  proctor's `PROCTOR_FAKE_LLM=1`) so tests and the local demo run without API keys.
- **Mocks:** Slack Web API, Slack MCP server, and RTS are mocked at the `packages/slack` boundary.

## 8. Tech Stack (locked, mirrors proctor)

- pnpm monorepo (`packages/*`, `workflows`, `apps/*`), Node 24, pnpm 9.12.
- `workflow@4.3.1`, `@workflow/ai`, `@workflow/vitest`, `@workflow/world-local` (local dev).
- Next.js 15.5.x, React 19.1, `@slack/bolt`, `@vercel/slack-bolt`.
- `ai` (AI SDK) + `@ai-sdk/mcp` + `@modelcontextprotocol/sdk`; model via Vercel AI Gateway
  (`anthropic/claude-sonnet-4.5`) or direct provider key.
- `zod` for schemas; `vitest` + `tsx` + TypeScript 5.6.

## 9. Deployment

- **Local dev/demo:** `@workflow/world-local` + Next dev + Slack (Socket Mode acceptable *only*
  for local dev; production path is HTTP). `QUORUM_FAKE_LLM=1` for offline runs.
- **Production:** `vercel deploy` (region `iad1` — Vercel World requirement). Slack app manifest
  points Request URL + Interactivity URL at the deployed `/api/slack/*` routes; HTTP events mode.
- `next.config.ts`: `withWorkflow(nextConfig)`. If middleware exists, exclude
  `.well-known/workflow/` from the matcher.
- Secrets: `SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN` (RTS private scopes), `SLACK_SIGNING_SECRET`,
  `AI_GATEWAY_API_KEY` (or provider key).
- **Sandbox access for judges:** grant the sandbox workspace to `slackhack@salesforce.com` and
  `testing@devpost.com` per submission rules.

## 10. Slack App Manifest (key settings)

- Enable **Agents & AI Apps** (adds `assistant:write`; enables suggested prompts + agent surface).
- `settings.is_mcp_enabled: true` (Slack MCP server).
- Bot event subscriptions: `assistant_thread_started`, `assistant_thread_context_changed`,
  `message.im`, `message.channels` (proactive detection in opted-in channels), `app_mention`.
- Slash command: `/decisions`.
- Message shortcut: "📌 Capture decision".
- Scopes: `assistant:write`, `chat:write`, `commands`, `canvases:write`, `canvases:read`,
  `channels:history`, `groups:history`, `im:history`, `search:read.public`, `search:read.files`,
  `search:read.users` (bot); user token adds `search:read.private`, `search:read.im`,
  `search:read.mpim` for private retrieval.

## 11. Demo Script (<3 min — the winning artifact)

1. **0:00–0:15** — Problem: scroll a messy `#eng` thread debating a DB choice; "decisions like
   this vanish."
2. **0:15–0:45** — Proactive nudge appears ("Capture this decision?"); click it. Durable approval
   card renders the drafted Decision Record.
3. **0:45–1:15** — Edit one field, click **Approve**. Record appears in `#decision-log` **and** the
   Decision Log Canvas (before/after split).
4. **1:15–2:15** — Days later (simulated): `/decisions what did we decide about the database?` →
   agent runs RTS, returns the decision **with a clickable permalink citation**, plus a related
   raw-thread it found via semantic search.
5. **2:15–2:50** — Flash the architecture diagram; name the three techs (Agent + MCP + RTS) and
   the durable human-in-the-loop. Close.

## 12. Risks

- **BLOCKING-to-verify:** `@workflow/ai` `DurableAgent` is experimental; `abortSignal` unsupported
  (use `timeout`). Confirm installed `ai` vs `@ai-sdk/mcp` MCP export name at build time.
- **WARNING:** Slack MCP server requires a registered app with fixed App ID and directory-published
  *or* internal app; confirm sandbox app qualifies as "internal" for MCP. Fallback: call the
  equivalent Slack Web API methods directly from the step if MCP is gated (still satisfies RTS req).
- **WARNING:** RTS semantic mode depends on Slack AI being enabled on the workspace; keyword mode is
  the floor. Confirm sandbox has AI search; otherwise demo keyword retrieval.
- **INFO:** Socket Mode is a dead end on Vercel serverless — HTTP events only in production.

## 13. Open Questions (resolved in plan)
- Exact model for classifier vs drafter (cost/latency split).
- Canvas update strategy: full re-render vs section-append (MCP `canvases.edit` capabilities).
- Whether `/decisions` Q&A runs as a full DurableAgent or a single grounded `generateText` for MVP.
