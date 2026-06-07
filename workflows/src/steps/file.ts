import { recordToCanvasMarkdown, recordToChannelText, type DecisionRecord } from "@quorum/shared";
import { fileDecisionViaMcp, type SlackMcpTools } from "@quorum/slack/mcp";
import { cfg } from "../env.js";

/** Testable core: tools injected. */
export async function fileRecordCore(
  r: DecisionRecord,
  p: { canvasId: string; channelId: string; tools: SlackMcpTools },
): Promise<{ logPermalink?: string }> {
  return fileDecisionViaMcp({
    canvasId: p.canvasId, channelId: p.channelId,
    canvasMarkdown: recordToCanvasMarkdown(r), channelText: recordToChannelText(r),
  }, { tools: p.tools });
}

/** Step: connects to Slack MCP, adapts live tool names, files the record. */
export async function fileRecordStep(r: DecisionRecord): Promise<{ logPermalink?: string }> {
  "use step";
  if (cfg.fakeLlm()) return { logPermalink: `https://example.slack.com/archives/CLOG/p${r.id}` };
  const { connectSlackMcp } = await import("@quorum/slack/mcp-client");
  const { client, tools } = await connectSlackMcp(cfg.userToken());
  try {
    // Adapt the live MCP tool surface to our SlackMcpTools shape.
    // Real tool keys are discovered from `tools` (e.g. tools["canvases.edit"]).
    const adapter: SlackMcpTools = {
      canvasEdit: (a) => callTool(tools, ["canvases.edit", "canvas_edit", "canvases_edit"],
        { canvas_id: a.canvas_id, changes: [{ operation: "insert_at_end",
          document_content: { type: "markdown", markdown: a.markdown } }] }),
      chatPost: (a) => callTool(tools, ["chat.postMessage", "send_message", "chat_postMessage"],
        { channel: a.channel, text: a.text }).then((res: any) => ({ permalink: res?.permalink })),
    };
    return await fileRecordCore(r, { canvasId: cfg.logCanvas(), channelId: cfg.logChannel(), tools: adapter });
  } finally {
    await client.close?.();
  }
}

function callTool(tools: Record<string, any>, names: string[], args: unknown): Promise<any> {
  const key = names.find((n) => tools[n]);
  if (!key) throw new Error(`MCP tool not found: tried ${names.join(", ")}`);
  return tools[key].execute ? tools[key].execute(args) : tools[key](args);
}
