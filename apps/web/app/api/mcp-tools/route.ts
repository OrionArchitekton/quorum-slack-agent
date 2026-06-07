export const dynamic = "force-dynamic";

// TEMPORARY diagnostic: list the Slack MCP server's actual tool names so we can
// wire the correct canvas/post tool keys. Remove after use.
export async function GET() {
  const readEnv = (k: string) => process.env[k];
  try {
    const { connectSlackMcp } = await import("@quorum/slack/mcp-client");
    const { client, tools } = await connectSlackMcp(readEnv("SLACK_USER_TOKEN")!);
    const names = Object.keys(tools);
    await client.close?.();
    return Response.json({ ok: true, count: names.length, tools: names });
  } catch (e: unknown) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
