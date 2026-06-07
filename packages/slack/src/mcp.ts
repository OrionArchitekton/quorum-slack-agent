// Import per Task 0 finding: createMCPClient is the canonical export name in @ai-sdk/mcp v1.x
import { createMCPClient } from "@ai-sdk/mcp";

export type SlackMcpTools = {
  canvasEdit: (a: { canvas_id: string; markdown: string }) => Promise<any>;
  chatPost: (a: { channel: string; text: string }) => Promise<{ permalink?: string }>;
};

/** Build an MCP client against Slack's hosted MCP server. Call ONLY inside a "use step". */
export async function connectSlackMcp(userToken: string) {
  const client = await createMCPClient({
    transport: { type: "http", url: "https://mcp.slack.com/mcp",
      headers: { authorization: `Bearer ${userToken}` } },
  });
  const tools = await client.tools();
  return { client, tools };
}

/** Pure orchestration — tools injected so it is unit-testable without network. */
export async function fileDecisionViaMcp(
  p: { canvasId: string; channelId: string; canvasMarkdown: string; channelText: string },
  deps: { tools: SlackMcpTools },
): Promise<{ logPermalink?: string }> {
  await deps.tools.canvasEdit({ canvas_id: p.canvasId, markdown: p.canvasMarkdown });
  const posted = await deps.tools.chatPost({ channel: p.channelId, text: p.channelText });
  return { logPermalink: posted.permalink };
}
