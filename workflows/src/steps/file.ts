import { recordToCanvasMarkdown, recordToChannelText, type DecisionRecord } from "@quorum/shared";
import { fileDecisionViaMcp, type SlackMcpTools } from "@quorum/slack/mcp";
import { cfg } from "../env.js";

/**
 * Testable core: tools injected. Retained as a unit-tested helper; the live step
 * files via the Bot Web API (see fileRecordStep) because the Slack MCP server is
 * scope-gated to search tools only and does not expose canvas/post writes.
 */
export async function fileRecordCore(
  r: DecisionRecord,
  p: { canvasId: string; channelId: string; tools: SlackMcpTools },
): Promise<{ logPermalink?: string }> {
  return fileDecisionViaMcp(
    {
      canvasId: p.canvasId,
      channelId: p.channelId,
      canvasMarkdown: recordToCanvasMarkdown(r),
      channelText: recordToChannelText(r),
    },
    { tools: p.tools },
  );
}

/**
 * Step: files an approved record to the Decision Log canvas + #decision-log
 * channel via the Slack Bot Web API (bot token already has canvases:write +
 * chat:write). Filing is a write path; the Slack MCP server only exposes
 * search tools for our scopes, so writes go through the Web API directly.
 */
export async function fileRecordStep(r: DecisionRecord): Promise<{ logPermalink?: string }> {
  "use step";
  if (cfg.fakeLlm()) return { logPermalink: `https://example.slack.com/archives/CLOG/p${r.id}` };

  const jsonHeaders = {
    authorization: `Bearer ${cfg.botToken()}`,
    "content-type": "application/json; charset=utf-8",
  };

  // 1. Append the record to the canonical Decision Log canvas.
  const canvasRes = await fetch("https://slack.com/api/canvases.edit", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      canvas_id: cfg.logCanvas(),
      changes: [
        {
          operation: "insert_at_end",
          document_content: { type: "markdown", markdown: recordToCanvasMarkdown(r) },
        },
      ],
    }),
  });
  const canvasJson = (await canvasRes.json()) as { ok: boolean; error?: string };
  if (!canvasJson.ok) throw new Error(`canvases.edit failed: ${canvasJson.error}`);

  // 2. Post the structured record to #decision-log (so RTS can index it).
  const postRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ channel: cfg.logChannel(), text: recordToChannelText(r) }),
  });
  const postJson = (await postRes.json()) as { ok: boolean; error?: string; ts?: string };
  if (!postJson.ok) throw new Error(`chat.postMessage failed: ${postJson.error}`);

  // 3. Resolve a permalink to the filed record (best-effort).
  let logPermalink: string | undefined;
  if (postJson.ts) {
    const pl = await fetch(
      `https://slack.com/api/chat.getPermalink?channel=${cfg.logChannel()}&message_ts=${postJson.ts}`,
      { headers: { authorization: `Bearer ${cfg.botToken()}` } },
    );
    const plJson = (await pl.json()) as { ok: boolean; permalink?: string };
    if (plJson.ok) logPermalink = plJson.permalink;
  }
  return { logPermalink };
}
