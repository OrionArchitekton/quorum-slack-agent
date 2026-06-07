import { start, resumeHook } from "workflow/api";
import { captureWorkflow } from "@quorum/workflows/src/capture.js";
import { qaWorkflow } from "@quorum/workflows/src/qa-agent.js";
import { classifyDecisionStep } from "@quorum/workflows/src/steps/classify.js";
import { cfg } from "@quorum/workflows/src/env.js";
import type { App } from "@slack/bolt";

let seq = Date.now() % 10000; // demo-grade monotonic id source; can collide across restarts (single-sandbox demo only)

// Per-thread dedup so we never post more than one nudge per thread (single-sandbox demo only).
const nudgedThreads = new Set<string>();

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
    // Channel allowlist. Empty allowlist = nudge disabled (default — never spam).
    const allowed = cfg.nudgeChannels();
    if (allowed.length === 0) return;
    if (!allowed.includes(e.channel)) return;
    // Per-thread dedup: at most one nudge per thread.
    const threadKey = `${e.channel}:${e.thread_ts ?? e.ts}`;
    if (nudgedThreads.has(threadKey)) return;
    const c = await classifyDecisionStep(e.text ?? "");
    if (c.isDecision && c.confidence > 0.7) {
      nudgedThreads.add(threadKey);
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
  // Edit → open a modal pre-filled from the card's draft metadata.
  app.action("quorum_edit", async ({ ack, action, body, client }) => {
    await ack();
    const token = (action as any).value;
    // Pre-fill from message.metadata.event_payload when available (attached by postApprovalCardStep).
    const payload =
      (body as any).message?.metadata?.event_payload ?? ({} as Record<string, unknown>);
    const initTitle = typeof payload.title === "string" ? payload.title : "";
    const initDecision = typeof payload.decision === "string" ? payload.decision : "";
    const initRationale = typeof payload.rationale === "string" ? payload.rationale : "";
    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: "modal",
        callback_id: "quorum_edit_modal",
        private_metadata: token,
        title: { type: "plain_text", text: "Edit decision" },
        submit: { type: "plain_text", text: "Save" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [
          {
            type: "input",
            block_id: "title",
            label: { type: "plain_text", text: "Title" },
            element: {
              type: "plain_text_input",
              action_id: "value",
              initial_value: initTitle,
            },
          },
          {
            type: "input",
            block_id: "decision",
            label: { type: "plain_text", text: "Decision" },
            element: {
              type: "plain_text_input",
              action_id: "value",
              multiline: true,
              initial_value: initDecision,
            },
          },
          {
            type: "input",
            block_id: "rationale",
            label: { type: "plain_text", text: "Rationale" },
            element: {
              type: "plain_text_input",
              action_id: "value",
              multiline: true,
              initial_value: initRationale,
            },
          },
        ],
      },
    });
  });

  // Edit modal submit → resume the hook with the edited fields.
  app.view("quorum_edit_modal", async ({ ack, view }) => {
    await ack();
    const token = view.private_metadata;
    const v = view.state.values as any;
    await resumeHook(token, {
      action: "edit",
      edited: {
        title: v.title?.value?.value ?? "",
        decision: v.decision?.value?.value ?? "",
        rationale: v.rationale?.value?.value ?? "",
      },
    });
  });

  // @Quorum mention → grounded Q&A, replied in-thread
  app.event("app_mention", async ({ event, say }) => {
    const e = event as any;
    const question = (e.text ?? "").replace(/<@[^>]+>\s*/g, "").trim();
    if (!question) return;
    try {
      const run = await start(qaWorkflow, [question]);
      const answer = await run.returnValue;
      const last = (answer as any[]).at(-1);
      await say({
        thread_ts: e.thread_ts ?? e.ts,
        text: typeof last?.content === "string" ? last.content : "See above for the answer.",
      });
    } catch {
      await say({ thread_ts: e.thread_ts ?? e.ts, text: "Sorry — I couldn't pull that up." });
    }
  });

  // Slash /decisions → grounded Q&A
  app.command("/decisions", async ({ command, ack, respond }) => {
    await ack();
    try {
      const run = await start(qaWorkflow, [command.text]);
      const answer = await run.returnValue;
      const last = (answer as any[]).at(-1);
      await respond({
        response_type: "in_channel",
        text: typeof last?.content === "string" ? last.content : "See thread for the answer.",
      });
    } catch {
      await respond({
        response_type: "ephemeral",
        text: "Sorry — I couldn't pull that up. Try again.",
      });
    }
  });
}
