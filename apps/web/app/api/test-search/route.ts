export const dynamic = "force-dynamic";

// TEMPORARY: exercise the RTS search steps in isolation to see real results/errors.
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const { searchRecordsStep, searchWorkspaceStep } = await import(
      "@quorum/workflows/src/steps/search.js"
    );
    try {
      out.records = await searchRecordsStep("database");
    } catch (e) {
      out.recordsError = e instanceof Error ? e.message : String(e);
    }
    try {
      out.workspace = await searchWorkspaceStep("database");
    } catch (e) {
      out.workspaceError = e instanceof Error ? e.message : String(e);
    }
  } catch (e) {
    out.importError = e instanceof Error ? e.message : String(e);
  }
  return Response.json(out);
}
