export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "database";
  const out: Record<string, unknown> = {};
  try {
    const { mcpSearchStep } = await import("@quorum/workflows/src/steps/mcpSearch.js");
    const r = await mcpSearchStep(q);
    out.ok = true;
    out.textPreview = r.text.slice(0, 500);
    out.textLen = r.text.length;
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  return Response.json(out);
}
