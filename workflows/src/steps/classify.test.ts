process.env["QUORUM_FAKE_LLM"] = "1";
import { describe, it, expect } from "vitest";
import { classifyDecisionStep } from "./classify.js";

it("flags decisive language as a likely decision (fake mode heuristic)", async () => {
  const r = await classifyDecisionStep("Decision: we will go with Postgres. Final call.");
  expect(r.isDecision).toBe(true);
  expect(r.confidence).toBeGreaterThan(0.5);
});
it("does not flag idle chatter", async () => {
  const r = await classifyDecisionStep("lol nice weekend everyone");
  expect(r.isDecision).toBe(false);
});
