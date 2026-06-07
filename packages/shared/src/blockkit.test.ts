import { describe, it, expect } from "vitest";
import { approvalCardBlocks } from "./blockkit.js";
import type { DecisionRecord } from "./record.js";

const rec: DecisionRecord = {
  id: "DR-2026-0001", title: "Use Postgres", decision: "We will use Postgres",
  rationale: "Familiarity", participants: ["U1"], decidedAt: "2026-06-06T00:00:00.000Z",
  sourcePermalink: "https://x.slack.com/archives/C/p1", status: "proposed", tags: ["db"],
};

it("renders an approve and edit button with the record id in action_id", () => {
  const blocks = approvalCardBlocks(rec, "tok123");
  const json = JSON.stringify(blocks);
  expect(json).toContain("Approve");
  expect(json).toContain("Edit");
  expect(json).toContain("tok123");          // hook token routed via action value
  expect(json).toContain("Use Postgres");
});
