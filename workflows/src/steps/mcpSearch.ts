import type { Citation } from "@quorum/shared";
import { cfg } from "../env.js";

/** MCP tool results arrive as { content: [{type:"text", text:"<json>"}], isError }. */
function extractMcpText(res: unknown): string {
  const r = res as { content?: Array<{ type?: string; text?: string }> };
  const raw = r?.content?.find((c) => c.type === "text")?.text ?? "";
  try {
    const parsed = JSON.parse(raw) as { results?: unknown };
    return typeof parsed.results === "string" ? parsed.results : raw;
  } catch {
    return raw;
  }
}

/**
 * Search the workspace via the Slack MCP server's `slack_search_public_and_private`
 * tool (Model Context Protocol). This is the agent's broad-workspace search path,
 * complementing the RTS-backed curated-record search.
 */
export async function mcpSearchStep(query: string): Promise<{ text: string; sources: Citation[] }> {
  "use step";
  const { connectSlackMcp } = await import("@quorum/slack/mcp-client");
  const { client, tools } = await connectSlackMcp(cfg.userToken());
  try {
    const reg = tools as Record<string, any>;
    const tool = reg["slack_search_public_and_private"] ?? reg["slack_search_public"];
    if (!tool) throw new Error(`no slack search MCP tool; have: ${Object.keys(reg).join(",")}`);
    const res = await (tool.execute ? tool.execute({ query }) : tool({ query }));
    return { text: extractMcpText(res), sources: [] };
  } finally {
    await (client as { close?: () => Promise<void> }).close?.();
  }
}
