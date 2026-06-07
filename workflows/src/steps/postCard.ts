import { cfg } from "../env.js";

export async function postApprovalCardStep(p: { channel: string; threadTs: string; blocks: unknown[] }): Promise<{ ts: string }> {
  "use step";
  if (cfg.fakeLlm()) return { ts: "1111111111.000100" };
  const r = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.botToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ channel: p.channel, thread_ts: p.threadTs, blocks: p.blocks, text: "Decision captured — review" }),
  });
  const j = (await r.json()) as any;
  if (!j.ok) throw new Error(j.error || "post_failed");
  return { ts: j.ts };
}

export async function updateMessageStep(p: { channel: string; ts: string; blocks: unknown[]; text: string }): Promise<void> {
  "use step";
  if (cfg.fakeLlm()) return;
  await fetch("https://slack.com/api/chat.update", {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.botToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ channel: p.channel, ts: p.ts, blocks: p.blocks, text: p.text }),
  });
}
