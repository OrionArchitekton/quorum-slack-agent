import { sleep } from "workflow";
import { approvalHook } from "./hooks/approval.js";
import { fetchThreadStep } from "./steps/fetchThread.js";
import { draftRecordStep } from "./steps/draft.js";
import { postApprovalCardStep, updateMessageStep } from "./steps/postCard.js";
import { fileRecordStep } from "./steps/file.js";
import {
  approvalCardBlocks,
  filedConfirmationBlocks,
  DecisionRecordSchema,
} from "@quorum/shared";

export async function captureWorkflow(input: {
  channel: string;
  threadTs: string;
  seq: number;
  year: number;
}) {
  "use workflow";
  const thread = await fetchThreadStep({
    channel: input.channel,
    threadTs: input.threadTs,
  });
  let record = await draftRecordStep({
    threadText: thread.text,
    participants: thread.participants,
    permalink: thread.permalink,
    seq: input.seq,
    year: input.year,
  });

  const token = `approve:${input.channel}:${input.threadTs}`;
  const card = await postApprovalCardStep({
    channel: input.channel,
    threadTs: input.threadTs,
    blocks: approvalCardBlocks(record, token),
  });

  const decision = await Promise.race([
    approvalHook.create({ token }),
    sleep("7d").then(() => ({ action: "expire" as const })),
  ]);

  if (decision.action === "discard" || decision.action === "expire") {
    await updateMessageStep({
      channel: input.channel,
      ts: card.ts,
      text: "Decision capture closed.",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              decision.action === "expire"
                ? "⌛ Approval expired."
                : "🗑️ Discarded.",
          },
        },
      ],
    });
    return { status: decision.action };
  }

  if (decision.action === "edit" && decision.edited) {
    record = DecisionRecordSchema.parse({
      ...record,
      ...decision.edited,
      status: "accepted",
    });
  } else {
    record = DecisionRecordSchema.parse({ ...record, status: "accepted" });
  }

  const filed = await fileRecordStep(record);
  await updateMessageStep({
    channel: input.channel,
    ts: card.ts,
    text: "Filed",
    blocks: filedConfirmationBlocks(record, filed.logPermalink ?? ""),
  });
  return { status: "filed", id: record.id, logPermalink: filed.logPermalink };
}
