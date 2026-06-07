# Quorum — Architecture

> This diagram is the required hackathon **architecture diagram** artifact. It renders on GitHub.

## System

```mermaid
flowchart TB
    subgraph Slack["Slack sandbox workspace"]
        SC["📌 Capture decision<br/>(message shortcut)"]
        EV["message events<br/>(opted-in channels)"]
        SL["/decisions<br/>(slash command)"]
        BTN["Approve / Edit / Discard<br/>(Block Kit buttons)"]
        LOG["#decision-log channel<br/>+ Decision Log Canvas"]
    end

    subgraph Web["apps/web — Next.js on Vercel (Fluid compute)"]
        REC["@vercel/slack-bolt<br/>VercelReceiver (HTTP, waitUntil ACK)"]
        EVR["/api/slack/events"]
        INR["/api/slack/interactions"]
        LIS["lib/listeners.ts"]
    end

    subgraph WF["workflows — Vercel Workflow DevKit"]
        CAP["capture.ts (use workflow)<br/>fetch → draft → approval hook ⟂ sleep 7d → file"]
        HOOK["hooks/approval.ts<br/>defineHook (typed payload)"]
        QA["qa-agent.ts (use workflow)<br/>DurableAgent"]
        STEPS["steps/* (use step)<br/>classify · draft · fetchThread · postCard · file · search"]
    end

    subgraph Ext["External APIs"]
        MCP["Slack MCP server<br/>mcp.slack.com — Canvas + chat"]
        RTS["Real-Time Search<br/>assistant.search.context"]
        LLM["AI Gateway<br/>(Claude via AI SDK v6)"]
    end

    SC --> EVR
    EV --> EVR
    SL --> EVR
    BTN --> INR
    EVR --> REC --> LIS
    INR --> REC
    LIS -->|"start()"| CAP
    LIS -->|"start()"| QA
    LIS -->|"classify (nudge)"| STEPS
    INR -->|"resumeHook(approve:ch:ts)"| HOOK
    HOOK -. resumes .-> CAP
    CAP --> STEPS
    QA --> STEPS
    STEPS -->|"file (in step, dynamic import)"| MCP
    STEPS -->|"search"| RTS
    STEPS -->|"draft / classify"| LLM
    MCP --> LOG
```

## Control-flow split (why hybrid)

| Flow | Primitive | Reason |
|---|---|---|
| Capture → approve → file | deterministic `"use workflow"` | Linear human-in-the-loop; durable suspend-for-approval (hours at zero compute) is the whole point. Demo-safe. |
| "what did we decide about X?" | `DurableAgent` | Branching reasoning (records-first vs RTS-over-raw-threads) is genuinely agentic. |

## Key durability + safety properties

- **3-second Slack ACK** via `@vercel/slack-bolt` `waitUntil` + Fluid compute; work continues in the background workflow.
- **Approval expiry**: `Promise.race([approvalHook, sleep("7d")])` — verified by an integration test.
- **MCP client only in steps**: `@ai-sdk/mcp` is dynamically imported inside the `"use step"` body so it never enters the sandboxed workflow VM (the bundler inlines the static graph).
- **Narrow subpath exports** on `@quorum/slack` keep `node:crypto` (signature verify) out of every workflow graph.
- **Permission scoping**: RTS returns only what the calling user can see; proactive detection runs only in app-present, opted-in channels.

## Module boundaries

```
packages/shared  ── pure: DecisionRecord schema, Block Kit + Canvas formatters, citations
packages/slack   ── I/O clients: verify (crypto), rts (fetch), mcp / mcp-client (@ai-sdk/mcp)
workflows        ── orchestration: capture (use workflow), qa-agent (DurableAgent), steps (use step), hooks
apps/web         ── edge: Bolt receiver, listeners, routes, health
```
