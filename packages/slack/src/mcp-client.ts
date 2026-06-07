// MCP client construction. This module statically imports @ai-sdk/mcp, whose
// transitive `pkce-challenge` dep has an exports map incompatible with the WDK
// workflows bundler's resolve conditions. It MUST therefore only ever be reached
// via a dynamic import() from inside a "use step" function body, so that
// workflow-mode dead-code elimination drops it from the workflows bundle and the
// steps bundle externalizes it. Never import this module statically from a path
// reachable by the workflow graph.

// Import per Task 0 finding: createMCPClient is the canonical export name in @ai-sdk/mcp v1.x.
import { createMCPClient } from "@ai-sdk/mcp";

/** Build an MCP client against Slack's hosted MCP server. Call ONLY inside a "use step". */
export async function connectSlackMcp(userToken: string) {
  const client = await createMCPClient({
    transport: {
      type: "http",
      url: "https://mcp.slack.com/mcp",
      headers: { authorization: `Bearer ${userToken}` },
    },
  });
  const tools = await client.tools();
  return { client, tools };
}
