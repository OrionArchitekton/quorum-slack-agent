import { generateObject } from "ai";
import { z } from "zod";
import { cfg } from "../env.js";

const Out = z.object({ isDecision: z.boolean(), confidence: z.number(), title: z.string() });
export type Classification = z.infer<typeof Out>;

export async function classifyDecisionStep(text: string): Promise<Classification> {
  "use step";
  if (cfg.fakeLlm()) {
    const decisive = /\b(decision|we will|we'll|final call|let's go with|agreed|decided)\b/i.test(text);
    return { isDecision: decisive, confidence: decisive ? 0.9 : 0.1,
      title: decisive ? text.slice(0, 60) : "" };
  }
  const { object } = await generateObject({
    model: cfg.classifierModel(), schema: Out,
    prompt: `Does this Slack message conclude a decision the team made? Reply strictly.\n\n${text}`,
  });
  return object;
}
