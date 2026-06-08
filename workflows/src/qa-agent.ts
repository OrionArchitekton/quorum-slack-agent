import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import { z } from "zod";
import type { UIMessageChunk } from "ai";
import { searchRecordsStep } from "./steps/search.js";
import { mcpSearchStep } from "./steps/mcpSearch.js";
import { formatCitations } from "@quorum/shared";
import { cfg } from "./env.js";

export async function qaWorkflow(question: string) {
  "use workflow";
  const agent = new DurableAgent({
    model: cfg.model(),
    instructions: [
      "You answer 'what did we decide about X' for a Slack workspace.",
      "ALWAYS call searchRecords first. If it returns little, also call searchWorkspace.",
      "Answer concisely and cite sources by permalink. Never invent decisions.",
    ].join(" "),
    tools: {
      searchRecords: {
        // Real-Time Search API (assistant.search.context) over curated records.
        description: "Search curated Decision Records in #decision-log.",
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }: { query: string }) => searchRecordsStep(query),
      },
      searchWorkspace: {
        // Slack MCP server (slack_search_public_and_private) for broad workspace search.
        description: "Search the whole workspace (incl. raw threads) via the Slack MCP server.",
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }: { query: string }) => mcpSearchStep(query),
      },
    },
  });
  const result = await agent.stream({
    messages: [{ role: "user", content: question }],
    writable: getWritable<UIMessageChunk>(),
    maxSteps: 5,
  });
  return result.messages;
}

export { formatCitations }; // used by route to append citations if needed
