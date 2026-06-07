import { describe, it, expect } from "vitest";
import { DecisionRecordSchema, makeRecordId } from "./record.js";

describe("DecisionRecordSchema", () => {
  it("accepts a valid record", () => {
    const r = {
      id: "DR-2026-0001", title: "Use Postgres",
      decision: "We will use Postgres", rationale: "Team familiarity",
      participants: ["U1"], decidedAt: "2026-06-06T00:00:00.000Z",
      sourcePermalink: "https://x.slack.com/archives/C/p1", status: "accepted",
      tags: ["db"],
    };
    expect(DecisionRecordSchema.parse(r).id).toBe("DR-2026-0001");
  });
  it("rejects an invalid status", () => {
    expect(() => DecisionRecordSchema.parse({ status: "maybe" })).toThrow();
  });
});
describe("makeRecordId", () => {
  it("formats DR-YYYY-NNNN zero-padded", () => {
    expect(makeRecordId(2026, 42)).toBe("DR-2026-0042");
  });
});
