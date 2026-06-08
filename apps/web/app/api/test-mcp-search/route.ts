export const dynamic = "force-dynamic";

// TEMPORARY: probe the Slack MCP search tool's args + response shape.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "database";
  const out: Record<string, unknown> = {};
  try {
    const { connectSlackMcp } = await import("@quorum/slack/mcp-client");
    const { client, tools } = await connectSlackMcp(process.env["SLACK_USER_TOKEN"]!);
    out.toolNames = Object.keys(tools);
    const tool = (tools as Record<string, any>)["slack_search_public_and_private"];
    try {
      out.result = await (tool.execute ? tool.execute({ query: q }) : tool({ query: q }));
    } catch (e) {
      out.callError = e instanceof Error ? e.message : String(e);
    }
    await client.close?.();
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  return Response.json(out);
}
