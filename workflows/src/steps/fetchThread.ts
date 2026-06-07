import { cfg } from "../env.js";

export async function fetchThreadStep(p: { channel: string; threadTs: string }): Promise<{
  text: string; participants: string[]; permalink: string;
}> {
  "use step";
  if (cfg.fakeLlm()) {
    return { text: "Should we use Postgres or Mongo?\nWe will use Postgres. Final.",
      participants: ["U1", "U2"],
      permalink: `https://example.slack.com/archives/${p.channel}/p${p.threadTs.replace(".", "")}` };
  }
  const auth = { authorization: `Bearer ${cfg.botToken()}` };
  const r = await fetch(`https://slack.com/api/conversations.replies?channel=${p.channel}&ts=${p.threadTs}&limit=50`,
    { headers: auth });
  const j = (await r.json()) as any;
  if (!j.ok) throw new Error(j.error || "fetch_thread_failed");
  const msgs = (j.messages ?? []) as any[];
  const text = msgs.map((m) => m.text).join("\n");
  const participants = [...new Set(msgs.map((m) => m.user).filter(Boolean))];
  const pl = await fetch(`https://slack.com/api/chat.getPermalink?channel=${p.channel}&message_ts=${p.threadTs}`,
    { headers: auth });
  const plj = (await pl.json()) as any;
  return { text, participants, permalink: plj.permalink ?? `https://slack.com/archives/${p.channel}/p${p.threadTs}` };
}
