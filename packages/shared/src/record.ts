import { z } from "zod";

export const DecisionStatus = z.enum(["proposed", "accepted", "superseded"]);
export type DecisionStatus = z.infer<typeof DecisionStatus>;

export const DecisionRecordSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  decision: z.string().min(1),
  rationale: z.string().default(""),
  participants: z.array(z.string()).default([]),
  decidedAt: z.string(),
  sourcePermalink: z.string().url(),
  status: DecisionStatus,
  tags: z.array(z.string()).default([]),
  supersedes: z.string().optional(),
});
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;

export function makeRecordId(year: number, seq: number): string {
  return `DR-${year}-${String(seq).padStart(4, "0")}`;
}
