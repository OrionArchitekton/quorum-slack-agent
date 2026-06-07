process.env["QUORUM_FAKE_LLM"] = "1";
import { describe, it, expect } from "vitest";
import { draftRecordStep } from "./draft.js";

it("drafts a valid DecisionRecord from a thread (fake mode)", async () => {
  const rec = await draftRecordStep({
    threadText: "Should we use Postgres or Mongo?\nWe will use Postgres. Final.",
    participants: ["U1", "U2"],
    permalink: "https://x.slack.com/archives/C/p1",
    seq: 7, year: 2026,
  });
  expect(rec.id).toBe("DR-2026-0007");
  expect(rec.status).toBe("proposed");
  expect(rec.decision.length).toBeGreaterThan(0);
  expect(rec.sourcePermalink).toContain("p1");
});
