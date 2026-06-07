export async function GET() {
  return Response.json({ ok: true, service: "quorum", ts: new Date().toISOString() });
}
