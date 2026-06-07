import { createHandler } from "@vercel/slack-bolt";
import { getSlackApp } from "../../../../lib/slackApp.js";

// Force dynamic so Next does not attempt to statically evaluate this route at
// build time (the Slack app/receiver require runtime env vars).
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const { app, receiver } = getSlackApp();
  return createHandler(app, receiver)(req);
}
