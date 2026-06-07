import type { DecisionRecord } from "./record.js";

export function approvalCardBlocks(r: DecisionRecord, token: string) {
  return [
    { type: "header", text: { type: "plain_text", text: `📌 Decision: ${r.title}` } },
    { type: "section", text: { type: "mrkdwn",
      text: `*Decision:* ${r.decision}\n*Why:* ${r.rationale || "_none_"}` } },
    { type: "context", elements: [{ type: "mrkdwn",
      text: `${r.id} · <${r.sourcePermalink}|source thread> · status: ${r.status}` }] },
    { type: "actions", block_id: `quorum_approve:${token}`, elements: [
      { type: "button", style: "primary", text: { type: "plain_text", text: "Approve" },
        action_id: "quorum_approve", value: token },
      { type: "button", text: { type: "plain_text", text: "Edit" },
        action_id: "quorum_edit", value: token },
      { type: "button", style: "danger", text: { type: "plain_text", text: "Discard" },
        action_id: "quorum_discard", value: token },
    ]},
  ];
}

export function filedConfirmationBlocks(r: DecisionRecord, canvasUrl: string) {
  return [
    { type: "section", text: { type: "mrkdwn",
      text: `✅ Filed *${r.title}* (${r.id}) to <${canvasUrl}|Decision Log>.` } },
  ];
}
