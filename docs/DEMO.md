# Quorum — Deploy + Demo Runbook

## Part A — Deploy (Task 23, needs your sandbox + Vercel)

> Prereq: Slack CLI already logged into the sandbox ✓. You have bot/user tokens + signing secret.

1. **Deploy to Vercel** (region `iad1` — Vercel Workflow World requirement):
   ```bash
   cd /home/orion/src/quorum
   vercel link            # select/create project "quorum"
   vercel deploy --prod   # or push to a connected git branch
   ```
2. **Set env vars** in the Vercel project (Production):
   `SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_TEAM_ID`,
   `DECISION_LOG_CHANNEL_ID`, `DECISION_LOG_CANVAS_ID`, `AI_GATEWAY_API_KEY`,
   `QUORUM_MODEL=anthropic/claude-sonnet-4.5`, `QUORUM_CLASSIFIER_MODEL=anthropic/claude-haiku-4.5`.
   (Leave `QUORUM_FAKE_LLM` unset / `0` in production.)
3. **Wire the Slack app**: replace `REPLACE_WITH_DEPLOY_URL` in `slack-manifest.json` with the
   Vercel domain, then apply the manifest (`slack manifest` / app config UI) and **reinstall** to
   the sandbox.
4. **Enable MCP**: app settings → Agents & AI Apps → toggle **Model Context Protocol**
   (`is_mcp_enabled`). Confirm the app is internal/published so MCP is allowed.
5. **Create the Decision Log Canvas + #decision-log channel** once; put their ids in env.
6. **Confirm RTS / Slack AI search** is available on the sandbox (semantic mode; keyword is the floor).
7. **Grant judge access** to the sandbox: invite `slackhack@salesforce.com` and `testing@devpost.com`.

## Part B — Independent runtime verification (release-safety; do BEFORE claiming success)

- `curl https://<deploy>/api/health` → `{ "ok": true, "service": "quorum" }`
- `npx workflow health --backend vercel --project quorum` → endpoints reachable
- In Slack: shortcut → approval card appears → Approve → record lands in `#decision-log` + Canvas
  → `/decisions what did we decide about the database?` → cited answer.
- If any check fails, report which one with output — do not claim success.

## Part C — The <3-minute demo video

Seed material first:
```bash
SLACK_BOT_TOKEN=xoxb-... DEMO_CHANNEL_ID=C... pnpm demo
```

| Time | Beat |
|---|---|
| 0:00–0:15 | Scroll a messy `#eng` thread debating Postgres vs Mongo. "Decisions like this vanish into scrollback." |
| 0:15–0:45 | Proactive nudge appears → click **Capture**. The durable approval card renders the drafted Decision Record. |
| 0:45–1:15 | Edit a field, click **Approve**. Record appears in `#decision-log` **and** the Decision Log Canvas (before/after split). |
| 1:15–2:15 | "Days later": `/decisions what did we decide about the database?` → RTS-grounded answer **with a clickable permalink citation**, plus a related raw thread found via semantic search. |
| 2:15–2:50 | Flash [docs/ARCHITECTURE.md](ARCHITECTURE.md). Name the three techs (Agent + MCP + RTS) and the durable human-in-the-loop. Close. |

Video rules (from the hackathon): < 3 min, public on YouTube/Vimeo, show the agent taking real
actions, make the first 60 seconds count.

## Part D — Devpost submission checklist

- [ ] Track: **New Slack Agent**
- [ ] Text description (features + functionality)
- [ ] Demo video (< 3 min, public)
- [ ] Architecture diagram → [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] Slack developer sandbox URL + judge access granted
- [ ] (Optional cross-entry) also strong for **Best Technical Implementation** + **Best UX**
