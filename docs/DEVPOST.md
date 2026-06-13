# Quorum — Devpost Submission Copy

**Track:** New Slack Agent
**Tagline (≤200 char):** Decisions vanish in Slack threads. Quorum detects them, drafts a record, gets one-click approval, files it to a Canvas, and answers "what did we decide about X?" with cited sources.

---

## Inspiration

Teams make their most important calls in Slack — which database, which vendor, the postmortem's
root cause, the policy change — and then those decisions **vanish into scrollback**. A week later
someone re-litigates a settled question because nobody can find where it was decided. Existing
tools summarize conversations; none capture durable decision **provenance** (what was decided,
*why*, by *whom*, superseding *what*) and make it **retrievable** later. We wanted the workspace
itself to remember its decisions.

## What it does

Quorum is a Slack agent with a four-beat loop:

1. **Detect** — the `📌 Capture decision` message shortcut on any thread, or a proactive,
   spam-safe nudge that classifies messages and offers a "capture this decision?" button.
2. **Draft** — an LLM extracts a structured **Decision Record** (title, decision, rationale,
   participants, tags, source link) from the thread.
3. **Approve** — a durable human-in-the-loop step posts an Approve / Edit / Discard card and
   **suspends for up to 7 days at zero compute**, resuming the instant someone clicks Approve.
4. **File & recall** — the approved record is filed to a canonical **Decision Log Canvas** and a
   `#decision-log` channel; later, `/decisions what did we decide about X?` (or `@Quorum`) returns
   a synthesized answer **with permalink citations** back to the records.

Storage is Slack-native — your decisions live in your workspace, no external database.

## How we built it

A **hybrid architecture** that matches each primitive to the shape of the work:

- **Capture pipeline → deterministic Vercel Workflow** (`"use workflow"`): fetch thread → draft →
  durable approval hook (raced against `sleep("7d")` for expiry) → file. Reliability and
  suspend-for-approval are the whole point.
- **Q&A → a Vercel `DurableAgent`**: branching reasoning over two tools.

All three required Slack technologies are **load-bearing**:

- **Slack AI / Agent** — the `DurableAgent` + the Assistant/agent app surface.
- **MCP server integration** — the Q&A agent searches the workspace through the **hosted Slack MCP
  server** (`mcp.slack.com`, `slack_search_public_and_private`), called inside a workflow step.
- **Real-Time Search (RTS) API** — `assistant.search.context` retrieves curated Decision Records,
  permission-scoped to the asker, with permalink citations.

Stack: pnpm monorepo · `workflow@4.3.1` + `@workflow/ai` · Next.js 15.5 + `@slack/bolt` +
`@vercel/slack-bolt` (`VercelReceiver`, HTTP events) · AI SDK v6 + `@ai-sdk/mcp` · zod v4 · vitest.
Deployed on Vercel (`iad1`); 19 unit + 2 workflow-integration tests.

## Challenges we ran into

Every one of these was found and fixed against the live deployment:

- **`@vercel/slack-bolt` + Bolt init.** The receiver calls `app.init()` itself, so the Bolt `App`
  must be built with `deferInitialization: true` — otherwise Bolt throws "no token provided" even
  with a valid token passed. Cost us the longest debugging session.
- **Slack MCP server is scope-gated.** It only exposes tools matching the token's scopes — our
  search-scoped token surfaced only search tools, so canvas/channel **writes go through the Bot Web
  API** while **MCP powers the agent's workspace search**.
- **RTS `action_token`.** `assistant.search.context` with a *bot* token needs an `action_token`
  (only from a live event) → `invalid_action_token`; the *user* token doesn't, so record search
  uses it.
- **WDK bundler discipline.** The workflow VM inlines the static import graph, so Node-only deps
  (`node:crypto`, `@ai-sdk/mcp`) must stay out via subpath exports + dynamic `import()` inside steps.
- **pnpm on Vercel.** WDK's generated route couldn't resolve `@vercel/oidc` until we set
  `.npmrc node-linker=hoisted`.

## Accomplishments we're proud of

A complete, polished, *novel* agent that ships the whole loop — detect → draft → durable approval
→ file → cited recall — with a clean before/after demo, all three required techs genuinely used,
durable human-in-the-loop that survives redeploys, and a test suite that proves the workflow
actually suspends and resumes.

## What we learned

The Slack MCP server is best understood as a **scope-gated search/RAG surface**, RTS as compliant
permission-scoped retrieval, and Vercel Workflow as the right tool the moment an agent needs to
*wait* on a human. Matching control-flow shape (linear pipeline vs. branching agent) to the right
primitive is what makes the system both reliable and demoable.

## What's next

A native Slack Assistant-pane handler; "supersedes" chains that auto-mark older decisions; a
decisions digest; and multi-workspace distribution toward the Slack Marketplace.

## Built with

slack, slack-bolt, vercel, vercel-workflow, model-context-protocol, real-time-search-api,
typescript, next.js, ai-sdk, anthropic-claude, zod, vitest, pnpm

## Links

- Live: https://quorum-slack-agent.vercel.app
- Repo: https://github.com/OrionArchitekton/quorum-slack-agent
- Architecture diagram: `docs/architecture.png`
