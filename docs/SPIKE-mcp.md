# Task 0 Spike — Findings (2026-06-06)

## Resolved package versions (replace all PIN_FROM_TASK_0)

| Package | Version | Notes |
|---|---|---|
| `ai` | `^6.0.197` | **AI SDK v6** |
| `@ai-sdk/mcp` | `^1.0.46` | MCP client export is **`createMCPClient`** (graduated, not `experimental_`) |
| `@workflow/ai` | `5.0.0` | DurableAgent. Peer deps: `ai@^6`, `workflow@^4.3.0` (4.3.1 ✓), `@opentelemetry/api@^1`. Depends on **`zod@4`** |
| `@modelcontextprotocol/sdk` | `^1.29.0` | |
| `@slack/bolt` | `^4.7.3` | |
| `@vercel/slack-bolt` | `^1.4.3` | |
| `zod` | `^4.3.6` | **BUMPED v3→v4** — required by `@workflow/ai` + `ai@6`. Use v4 across ALL packages. |
| `@workflow/{vitest,builders}` | `4.0.9` | match proctor |
| `@workflow/rollup` | `4.0.8` | match proctor |
| `@workflow/world-local` | `4.1.4` | match proctor |
| `workflow` | `4.3.1` | match proctor |

### zod v4 impact
Schemas in the plan (`z.object`, `z.enum`, `z.array`, `.default`, `.partial`, `z.infer`, `z.string().url()`)
are all valid in zod v4. No code changes needed beyond the version bump. Set zod `^4.3.6` in
`packages/shared`, `packages/slack` (transitive), and `workflows`.

### MCP client export (confirms plan Task 8/13)
```ts
import { createMCPClient } from "@ai-sdk/mcp";
```

## Slack MCP server — LIVE, eligible ✓
`curl https://mcp.slack.com/.well-known/oauth-protected-resource` returns 200 with
`resource: https://mcp.slack.com` and `scopes_supported` including exactly what we need:
`search:read.public/private/mpim/im/files/users`, `chat:write`, `canvases:read`, `canvases:write`,
`channels:history`, `users:read`, `reactions:write`, etc.

**Decision:** MCP stays **load-bearing** (`fileRecordStep` via Slack MCP). No Web-API fallback required.

## Open items requiring the USER's sandbox (flagged, NON-blocking for offline build/tests)
All of these only matter at **live deploy (Task 23)**; `QUORUM_FAKE_LLM=1` covers all tests + local build offline.

- [ ] **Enable MCP on the sandbox app**: app settings → Agents & AI Apps → toggle **Model Context Protocol**
      (sets `is_mcp_enabled: true`). Requires the app to be internal or directory-published.
- [ ] **Confirm RTS / Slack AI search** on the sandbox workspace: semantic mode needs Slack AI enabled;
      keyword mode (`assistant.search.context`) is the floor. Confirm before the demo.
- [ ] **Provide env** at deploy: `SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN` (RTS private scopes),
      `SLACK_SIGNING_SECRET`, `AI_GATEWAY_API_KEY` (for the non-fake LLM path), channel + canvas ids.

## Model path (resolved earlier)
Gateway model id strings everywhere (`anthropic/claude-sonnet-4.5`, `anthropic/claude-haiku-4.5`)
via `AI_GATEWAY_API_KEY`. No `@ai-sdk/anthropic`, no `model.ts`.
