export const dynamic = "force-dynamic";

// TEMPORARY preflight: exercises the whole demo pipeline server-side so we can
// confirm gateway credit + LLM + MCP + RTS before recording. Remove after use.
export async function GET() {
  const out: Record<string, unknown> = {};
  const readEnv = (k: string) => process.env[k];

  // 1. AI Gateway credit balance
  try {
    const key = readEnv("AI_GATEWAY_API_KEY");
    const r = await fetch("https://ai-gateway.vercel.sh/v1/credits", {
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    });
    out.gatewayCredits = await r.json();
  } catch (e) {
    out.gatewayError = e instanceof Error ? e.message : String(e);
  }

  // 2. LLM path (real gateway call via the classifier step)
  try {
    const { classifyDecisionStep } = await import("@quorum/workflows/src/steps/classify.js");
    out.llm = await classifyDecisionStep("We will use Postgres. Final call.");
  } catch (e) {
    out.llmError = e instanceof Error ? e.message : String(e);
  }

  // 3. MCP search (Slack MCP server)
  try {
    const { mcpSearchStep } = await import("@quorum/workflows/src/steps/mcpSearch.js");
    const r = await mcpSearchStep("database");
    out.mcp = { ok: true, chars: r.text.length };
  } catch (e) {
    out.mcpError = e instanceof Error ? e.message : String(e);
  }

  // 4. RTS record search
  try {
    const { searchRecordsStep } = await import("@quorum/workflows/src/steps/search.js");
    const r = await searchRecordsStep("database");
    out.rts = { ok: true, sources: r.sources.length };
  } catch (e) {
    out.rtsError = e instanceof Error ? e.message : String(e);
  }

  return Response.json(out);
}
