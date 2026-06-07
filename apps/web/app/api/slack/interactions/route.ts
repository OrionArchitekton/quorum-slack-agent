import { createHandler } from "@vercel/slack-bolt";
import { getSlackApp } from "../../../../lib/slackApp.js";

// Same handler — Bolt routes events, interactions, and commands internally.
// @vercel/slack-bolt's VercelReceiver handles all Slack payload types through a
// single handler, so one route URL can serve both events and interactivity.
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const { app, receiver } = getSlackApp();
  return createHandler(app, receiver)(req);
}
