import { start, resumeHook } from "workflow/api";
import { captureWorkflow } from "@quorum/workflows/src/capture.js";
import { qaWorkflow } from "@quorum/workflows/src/qa-agent.js";
import { classifyDecisionStep } from "@quorum/workflows/src/steps/classify.js";
import type { App } from "@slack/bolt";

let seq = Date.now() % 10000; // demo-grade monotonic id source; can collide across restarts (single-sandbox demo only)

export function registerListeners(app: App) {
  // Message shortcut: "📌 Capture decision"
  app.shortcut("quorum_capture", async ({ shortcut, ack }) => {
    await ack();
    const s = shortcut as any;
    await start(captureWorkflow, [
      {
        channel: s.channel.id,
        threadTs: s.message.thread_ts ?? s.message.ts,
        seq: ++seq,
        year: 2026,
      },
    ]);
  });

  // Proactive nudge: classify messages, offer ephemeral capture button
  app.event("message", async ({ event, client }) => {
    const e = event as any;
    if (e.subtype || e.bot_id) return;
    const c = await classifyDecisionStep(e.text ?? "");
    if (c.isDecision && c.confidence > 0.7) {
      await client.chat.postEphemeral({
        channel: e.channel,
        user: e.user,
        text: "Looks like a decision — capture it?",
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `📌 *${c.title}* — capture this decision?` },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                style: "primary",
                text: { type: "plain_text", text: "Capture" },
                action_id: "quorum_nudge_capture",
                value: JSON.stringify({ channel: e.channel, threadTs: e.thread_ts ?? e.ts }),
              },
            ],
          },
        ],
      });
    }
  });

  app.action("quorum_nudge_capture", async ({ ack, action }) => {
    await ack();
    const v = JSON.parse((action as any).value);
    await start(captureWorkflow, [{ ...v, seq: ++seq, year: 2026 }]);
  });

  // Approval buttons → resume the hook
  for (const a of ["quorum_approve", "quorum_discard"]) {
    app.action(a, async ({ ack, action, body }) => {
      await ack();
      const token = (action as any).value;
      await resumeHook(token, {
        action: a === "quorum_approve" ? "approve" : "discard",
        userId: (body as any).user?.id,
      });
    });
  }
  // (Edit opens a modal → on submit resumeHook with action:"edit", edited:{...}. MVP: approve/discard.)

  // Slash /decisions → grounded Q&A
  app.command("/decisions", async ({ command, ack, respond }) => {
    await ack();
    const run = await start(qaWorkflow, [command.text]);
    const answer = await run.returnValue;
    const last = (answer as any[]).at(-1);
    await respond({
      response_type: "in_channel",
      text: typeof last?.content === "string" ? last.content : "See thread for the answer.",
    });
  });
}
