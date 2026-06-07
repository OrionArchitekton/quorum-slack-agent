import { defineHook } from "workflow";
import { z } from "zod";

export const approvalHook = defineHook({
  schema: z.object({
    action: z.enum(["approve", "edit", "discard"]),
    edited: z
      .object({ title: z.string(), decision: z.string(), rationale: z.string() })
      .partial()
      .optional(),
    userId: z.string().optional(),
  }),
});
