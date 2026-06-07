/**
 * Seed a "messy decision thread" into a demo channel so the <3-min demo has
 * realistic material. Posts a parent message + a few replies that conclude a decision.
 *
 * Usage:
 *   SLACK_BOT_TOKEN=xoxb-... DEMO_CHANNEL_ID=C... pnpm demo
 *
 * Prints the channel + thread_ts so you can trigger the "📌 Capture decision"
 * shortcut (or wait for the proactive nudge) during the demo.
 */

const token = required("SLACK_BOT_TOKEN");
const channel = required("DEMO_CHANNEL_ID");

const parent =
  "Quick gut-check: for the new service do we go Postgres or Mongo? " +
  "We need transactions and the team already runs PG everywhere.";

const replies = [
  "Mongo's schema flexibility is nice for the early iterations though.",
  "True, but we keep hitting consistency bugs with it. Transactions matter here.",
  "Agreed. Let's go with Postgres — team familiarity + real transactions. Final call. 🚀",
];

async function post(text: string, thread_ts?: string): Promise<string> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ channel, text, ...(thread_ts ? { thread_ts } : {}) }),
  });
  const json = (await res.json()) as { ok: boolean; ts?: string; error?: string };
  if (!json.ok) throw new Error(`postMessage failed: ${json.error}`);
  return json.ts!;
}

async function main() {
  const rootTs = await post(parent);
  for (const r of replies) await post(r, rootTs);
  console.log("✅ Seeded decision thread.");
  console.log(`   channel:   ${channel}`);
  console.log(`   thread_ts: ${rootTs}`);
  console.log("   → run the '📌 Capture decision' shortcut on the final reply, or wait for the nudge.");
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
