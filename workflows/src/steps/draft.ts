import { generateObject } from "ai";
import { z } from "zod";
import { cfg } from "../env.js";
import { makeRecordId, DecisionRecordSchema, type DecisionRecord } from "@quorum/shared";

const Draft = z.object({
  title: z.string(), decision: z.string(), rationale: z.string(),
  tags: z.array(z.string()),
});

export async function draftRecordStep(p: {
  threadText: string; participants: string[]; permalink: string; seq: number; year: number;
  decidedAt?: string;
}): Promise<DecisionRecord> {
  "use step";
  let draft: z.infer<typeof Draft>;
  if (cfg.fakeLlm()) {
    const m = p.threadText.match(/we['']?ll? (?:use|go with) ([^.\n]+)/i);
    draft = { title: m ? `Use ${m[1]!.trim()}` : "Team decision",
      decision: m ? `We will use ${m[1]!.trim()}` : p.threadText.slice(0, 120),
      rationale: "Captured from thread discussion.", tags: ["uncategorized"] };
  } else {
    const { object } = await generateObject({
      model: cfg.model(), schema: Draft,
      prompt: `Extract the decision from this Slack thread as title/decision/rationale/tags.\n\n${p.threadText}`,
    });
    draft = object;
  }
  return DecisionRecordSchema.parse({
    id: makeRecordId(p.year, p.seq), ...draft,
    participants: p.participants, decidedAt: p.decidedAt ?? new Date().toISOString(),
    sourcePermalink: p.permalink, status: "proposed",
  } satisfies DecisionRecord);
}
