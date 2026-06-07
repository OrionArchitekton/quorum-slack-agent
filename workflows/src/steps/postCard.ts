import { cfg } from "../env.js";

export async function postApprovalCardStep(p: {
  channel: string;
  threadTs: string;
  blocks: unknown[];
  metadata?: Record<string, unknown>;
}): Promise<{ ts: string }> {
  "use step";
  if (cfg.fakeLlm()) return { ts: "1111111111.000100" };
  const body: Record<string, unknown> = {
    channel: p.channel,
    thread_ts: p.threadTs,
    blocks: p.blocks,
    text: "Decision captured — review",
  };
  if (p.metadata) {
    body["metadata"] = { event_type: "quorum_draft", event_payload: p.metadata };
  }
  const r = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.botToken()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
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
